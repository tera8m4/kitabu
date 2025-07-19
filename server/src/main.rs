use axum::{
    routing::get,
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;

mod websocket;
mod hotkey;
mod messages;

#[allow(dead_code, unused_imports, unsafe_code, unsafe_op_in_unsafe_fn)]
mod messages_generated;
mod paddle_ocr_service;
mod notification_service;

use hotkey::HotkeyManager;
use websocket::WebSocketService;

#[tokio::main]
async fn main() {
    // Create WebSocket service
    let websocket_service = Arc::new(WebSocketService::new());
    
    // Set up global hotkey manager
    let mut hotkey_manager = HotkeyManager::new(websocket_service.clone()).expect("Failed to create hotkey manager");
    hotkey_manager.register_screenshot_bind().expect("Failed to register Alt+A hotkey");
    hotkey_manager.register_audio_recoding_bind().expect("Failed to register Alt+R hotkey");

    // Spawn hotkey listener task
    let hotkey_task = tokio::spawn(async move {
        hotkey_manager.start_listening().await;
    });
    
    // Set up WebSocket server
    let websocket_service_for_app = websocket_service.clone();
    let app = Router::new()
        .route("/", get(move |ws| async move {
            websocket_service_for_app.handle_websocket(ws).await
        }));

    let addr = SocketAddr::from(([127, 0, 0, 1], 49156));
    let listener = TcpListener::bind(&addr).await.unwrap();
    
    println!("WebSocket server listening on: {}", addr);
    
    // Run both server and hotkey listener concurrently
    let server_task = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    
    let _ = tokio::try_join!(server_task, hotkey_task);
}
