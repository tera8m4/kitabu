use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyManager, GlobalHotKeyEvent,
};
use global_hotkey::HotKeyState::Pressed;
use tokio::time::{sleep, Duration};

use crate::websocket::{ClientSenders, send_message_to_clients};
use crate::messages::create_hotkey_message;

pub struct HotkeyManager {
    manager: GlobalHotKeyManager,
}

impl HotkeyManager {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let manager = GlobalHotKeyManager::new()?;
        Ok(Self { manager })
    }

    pub fn register_ctrl_a(&self) -> Result<(), Box<dyn std::error::Error>> {
        let hotkey = HotKey::new(Some(Modifiers::CONTROL), Code::KeyA);
        self.manager.register(hotkey)?;
        println!("Registered Ctrl+A hotkey");
        Ok(())
    }

    pub async fn start_listening(&self, clients: ClientSenders) {
        let receiver = GlobalHotKeyEvent::receiver();
        loop {
            if let Ok(event) = receiver.try_recv() {
                if event.state == Pressed {
                    let message = create_hotkey_message().await;
                    send_message_to_clients(clients.clone(), message).await;
                    println!("Hotkey pressed - Ctrl+A");
                }
            }
            sleep(Duration::from_millis(100)).await;
        }
    }
}