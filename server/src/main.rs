use axum::{
    routing::get,
    Router,
};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use std::sync::Arc;
use tokio::sync::Mutex;

mod websocket;
mod hotkey;
mod messages;

#[allow(dead_code, unused_imports, unsafe_code, unsafe_op_in_unsafe_fn)]
mod messages_generated;

use websocket::{websocket_handler, ClientSenders};
use hotkey::HotkeyManager;

#[tokio::main]
async fn main() {
    // Create shared state for connected clients
    let clients: ClientSenders = Arc::new(Mutex::new(Vec::new()));
    
    // Set up global hotkey manager
    let hotkey_manager = HotkeyManager::new().expect("Failed to create hotkey manager");
    hotkey_manager.register_ctrl_a().expect("Failed to register Ctrl+A hotkey");
    
    // Clone clients for hotkey task
    let clients_for_hotkey = clients.clone();
    
    // Spawn hotkey listener task
    let hotkey_task = tokio::spawn(async move {
        hotkey_manager.start_listening(clients_for_hotkey).await;
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
