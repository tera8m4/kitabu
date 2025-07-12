use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade},
    response,
    routing::get,
    Router,
};
use flatbuffers;
use std::net::SocketAddr;
use flatbuffers::FlatBufferBuilder;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use futures_util::{StreamExt, SinkExt};
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyManager, GlobalHotKeyEvent,
};
use std::sync::Arc;
use tokio::sync::Mutex;

#[allow(dead_code, unused_imports, unsafe_code, unsafe_op_in_unsafe_fn)]
mod messages_generated;
use messages_generated::protocol::*;

type ClientSenders = Arc<Mutex<Vec<mpsc::Sender<Vec<u8>>>>>;

async fn websocket_handler(
    ws: WebSocketUpgrade,
    axum::extract::State(clients): axum::extract::State<ClientSenders>,
) -> response::Response {
    ws.on_upgrade(move |socket| handle_socket(socket, clients))
}

async fn handle_socket(socket: WebSocket, clients: ClientSenders) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::channel::<Vec<u8>>(100);
    
    // Add this client to the global list
    {
        let mut clients_guard = clients.lock().await;
        clients_guard.push(tx.clone());
    }
    
    let socket_tx = tx.clone();
    let message_handler = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            if let Ok(msg) = msg {
                match msg {
                    axum::extract::ws::Message::Binary(data) => {
                        let tx_clone = socket_tx.clone();
                        tokio::spawn(async move {
                            if let Some(response) = handle_flatbuffer_message(&data).await {
                                let _ = tx_clone.send(response).await;
                            }
                        });
                    }
                    axum::extract::ws::Message::Close(_) => break,
                    _ => {}
                }
            } else {
                break;
            }
        }
    });

    let response_handler = tokio::spawn(async move {
        while let Some(response) = rx.recv().await {
            let _ = sender.send(axum::extract::ws::Message::Binary(response.into())).await;
        }
    });

    let _ = tokio::try_join!(message_handler, response_handler);
    
    // Remove this client from the global list when connection closes
    {
        let mut clients_guard = clients.lock().await;
        clients_guard.retain(|client_tx| !client_tx.is_closed());
    }
}

async fn handle_flatbuffer_message(data: &[u8]) -> Option<Vec<u8>> {
    let message = flatbuffers::root::<Message>(data).ok()?;
    
    match message.data_type() {
        MessageData::InitializationMessage => {
            Some(create_initialization_response(message.id()).await)
        }
        _ => None,
    }
}

async fn create_initialization_response(request_id: u64) -> Vec<u8> {
    let mut builder = FlatBufferBuilder::new();
    
    // For now, create an empty response since ResponseData doesn't have an initialization response type
    // We'll just acknowledge with the same ID
    let response = Response::create(&mut builder, &ResponseArgs {
        id: request_id,
        data_type: ResponseData::NONE,
        data: None,
    });
    
    builder.finish(response, None);
    builder.finished_data().to_vec()
}

async fn send_hotkey_message_to_clients(clients: ClientSenders) {
    let mut builder = FlatBufferBuilder::new();
    
    // Create a message indicating hotkey was pressed
    let response = Response::create(&mut builder, &ResponseArgs {
        id: 0, // Using 0 for hotkey-triggered messages
        data_type: ResponseData::NONE,
        data: None,
    });
    
    builder.finish(response, None);
    let message = builder.finished_data().to_vec();
    
    // Send to all connected clients
    let clients_guard = clients.lock().await;
    for client_tx in clients_guard.iter() {
        let _ = client_tx.send(message.clone()).await;
    }
    println!("Hotkey pressed - sent message to {} clients", clients_guard.len());
}

#[tokio::main]
async fn main() {
    // Create shared state for connected clients
    let clients: ClientSenders = Arc::new(Mutex::new(Vec::new()));
    
    // Set up global hotkey manager
    let manager = GlobalHotKeyManager::new().unwrap();
    let hotkey = HotKey::new(Some(Modifiers::CONTROL), Code::KeyA);
    manager.register(hotkey).unwrap();
    println!("Registered Ctrl+A hotkey");
    
    // Clone clients for hotkey task
    let clients_for_hotkey = clients.clone();
    
    // Spawn hotkey listener task
    let hotkey_task = tokio::spawn(async move {
        let receiver = GlobalHotKeyEvent::receiver();
        loop {
            if let Ok(_event) = receiver.try_recv() {
                send_hotkey_message_to_clients(clients_for_hotkey.clone()).await;
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }
    });
    
    // Set up WebSocket server
    let app = Router::new()
        .route("/", get(websocket_handler))
        .with_state(clients);

    let addr = SocketAddr::from(([127, 0, 0, 1], 49156));
    let listener = TcpListener::bind(&addr).await.unwrap();
    
    println!("WebSocket server listening on: {}", addr);
    
    // Run both server and hotkey listener concurrently
    let server_task = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    
    let _ = tokio::try_join!(server_task, hotkey_task);
}
