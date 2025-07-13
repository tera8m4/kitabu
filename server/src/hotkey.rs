use global_hotkey::HotKeyState::Pressed;
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyEvent, GlobalHotKeyManager,
};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

use crate::messages::create_hotkey_message;
use crate::websocket::WebSocketService;

pub struct HotkeyManager {
    manager: GlobalHotKeyManager,
    websocket_service: Arc<WebSocketService>
}

impl HotkeyManager {
    pub fn new(websocket_service: Arc<WebSocketService>) -> Result<Self, Box<dyn std::error::Error>> {
        let manager = GlobalHotKeyManager::new()?;
        Ok(Self { manager, websocket_service })
    }

    pub fn register_alt_a(&self) -> Result<(), Box<dyn std::error::Error>> {
        let hotkey = HotKey::new(Some(Modifiers::ALT), Code::KeyA);
        self.manager.register(hotkey)?;
        println!("Registered Alt+A hotkey");
        Ok(())
    }

    pub async fn start_listening(&self) {
        let receiver = GlobalHotKeyEvent::receiver();
        loop {
            if let Ok(event) = receiver.try_recv() {
                if event.state == Pressed {
                    let message = create_hotkey_message().await;
                    self.websocket_service.send_message_to_clients(message.clone()).await;
                    println!("Hotkey pressed - Alt+A");
                }
            }
            sleep(Duration::from_millis(100)).await;
        }
    }
}