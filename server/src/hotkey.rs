use global_hotkey::HotKeyState::Pressed;
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyEvent, GlobalHotKeyManager,
};
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tokio::process::Command;
use chrono;
use std::env;
use crate::messages::{create_audio_message, create_hotkey_message};
use crate::notification_service::send_notification;
use crate::websocket::WebSocketService;

pub struct HotkeyManager {
    manager: GlobalHotKeyManager,
    websocket_service: Arc<WebSocketService>,
    recording_audio_path: Option<std::path::PathBuf>,
}

impl HotkeyManager {
    pub fn new(websocket_service: Arc<WebSocketService>) -> Result<Self, Box<dyn std::error::Error>> {
        let manager = GlobalHotKeyManager::new()?;
        Ok(Self { 
            manager, 
            websocket_service,
            recording_audio_path: None,
        })
    }

    pub fn register_screenshot_bind(&self) -> Result<(), Box<dyn std::error::Error>> {
        let hotkey = HotKey::new(Some(Modifiers::ALT), Code::KeyA);
        self.manager.register(hotkey)?;
        println!("Registered Alt+A hotkey");
        Ok(())
    }

    pub fn register_audio_recoding_bind(&self) -> Result<(), Box<dyn std::error::Error>> {
        let hotkey = HotKey::new(Some(Modifiers::ALT), Code::KeyR);
        self.manager.register(hotkey)?;
        println!("Registered Alt+R hotkey for audio recording");
        Ok(())
    }

    async fn toggle_audio_recording(&mut self) {
        let currently_recording = self.recording_audio_path.is_some();
        
        if currently_recording {
            send_notification("Finished audio recording");
            self.stop_audio_recording().await;
        } else {
            send_notification("Started audio recording");
            self.start_audio_recording().await;
        }
    }

    async fn start_audio_recording(&mut self) {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let tmp_dir = env::temp_dir();
        let filename = tmp_dir.join(format!("audio_recording_{}.mp3", timestamp));
        self.recording_audio_path = Some(filename.clone());
        let filename_str = filename.to_string_lossy().to_string();
        
        tokio::spawn(async move {
            let _ = Command::new("ffmpeg")
                .arg("-f")
                .arg("pulse")
                .arg("-i")
                .arg("@DEFAULT_MONITOR@")
                .arg("-c:a")
                .arg("libmp3lame")
                .arg("-b:a")
                .arg("64k")
                .arg("-ar")
                .arg("22050")
                .arg("-y")
                .arg(&filename_str)
                .spawn();
        });
    }

    async fn stop_audio_recording(&mut self) {
        let _ = Command::new("pkill")
            .arg("-f")
            .arg("ffmpeg.*pulse.*@DEFAULT_MONITOR@")
            .spawn();

        if let Some(path) = self.recording_audio_path.take() {
            // Wait a bit for ffmpeg to properly close the file
            sleep(Duration::from_millis(500)).await;
            
            let message = create_audio_message(&path);
            self.websocket_service.send_message_to_clients(message).await;
        }
    }

    pub async fn start_listening(&mut self) {
        let receiver = GlobalHotKeyEvent::receiver();
        loop {
            if let Ok(event) = receiver.try_recv() {
                if event.state == Pressed {
                    match event.id {
                        id if id == HotKey::new(Some(Modifiers::ALT), Code::KeyA).id() => {
                            let message = create_hotkey_message().await;
                            self.websocket_service.send_message_to_clients(message.clone()).await;
                            println!("Hotkey pressed - Alt+A");
                            send_notification("Request screenshot from stream was send");
                        }
                        id if id == HotKey::new(Some(Modifiers::ALT), Code::KeyR).id() => {
                            self.toggle_audio_recording().await;
                            println!("Hotkey pressed - Alt+R");
                        }
                        _ => {}
                    }
                }
            }
            sleep(Duration::from_millis(100)).await;
        }
    }
}
