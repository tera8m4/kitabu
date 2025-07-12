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

#[allow(dead_code, unused_imports, unsafe_code, unsafe_op_in_unsafe_fn)]
mod messages_generated;
use messages_generated::protocol::*;

async fn websocket_handler(ws: WebSocketUpgrade) -> response::Response {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    while let Some(msg) = socket.recv().await {
        if let Ok(msg) = msg {
            match msg {
                axum::extract::ws::Message::Binary(data) => {
                    if let Some(response) = handle_flatbuffer_message(&data) {
                        let _ = socket.send(axum::extract::ws::Message::Binary(response)).await;
                    }
                }
                axum::extract::ws::Message::Close(_) => break,
                _ => {}
            }
        } else {
            break;
        }
    }
}

fn handle_flatbuffer_message(data: &[u8]) -> Option<Vec<u8>> {
    let message = flatbuffers::root::<Message>(data).ok()?;
    
    match message.data_type() {
        MessageData::InitializationMessage => {
            Some(create_initialization_response(message.id()))
        }
        _ => None,
    }
}

fn create_initialization_response(request_id: u64) -> Vec<u8> {
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
