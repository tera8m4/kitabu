use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade},
    response,
};
use futures_util::{StreamExt, SinkExt};
use tokio::sync::mpsc;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::messages::MessageService;

pub type ClientSenders = Arc<Mutex<Vec<mpsc::Sender<Vec<u8>>>>>;

pub struct WebSocketService {
    message_service: Arc<MessageService>,
    clients: ClientSenders,
}

impl WebSocketService {
    pub fn new() -> Self {
        Self {
            message_service: Arc::new(MessageService::new()),
            clients: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn handle_websocket(
        &self,
        ws: WebSocketUpgrade,
    ) -> response::Response {
        let clients = self.clients.clone();
        let message_service = self.message_service.clone();
        ws.on_upgrade(move |socket| Self::handle_socket(socket, clients, message_service))
    }

    async fn handle_socket(socket: WebSocket, clients: ClientSenders, message_service: Arc<MessageService>) {
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
                            let service = message_service.clone();
                            tokio::spawn(async move {
                                if let Some(response) = service.handle_flatbuffer_message(&data).await {
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

    pub async fn send_message_to_clients(&self, message: Vec<u8>) {
        let clients_guard = self.clients.lock().await;
        for client_tx in clients_guard.iter() {
            let _ = client_tx.send(message.clone()).await;
        }
        println!("Sent message to {} clients", clients_guard.len());
    }
}

