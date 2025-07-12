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

#[allow(dead_code, unused_imports, unsafe_code, unsafe_op_in_unsafe_fn)]
mod messages_generated;
use messages_generated::protocol::*;

async fn websocket_handler(ws: WebSocketUpgrade) -> response::Response {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(socket: WebSocket) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::channel::<Vec<u8>>(100);
    
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

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(websocket_handler));

    let addr = SocketAddr::from(([127, 0, 0, 1], 49156));
    let listener = TcpListener::bind(&addr).await.unwrap();
    
    println!("WebSocket server listening on: {}", addr);
    
    axum::serve(listener, app).await.unwrap();
}
