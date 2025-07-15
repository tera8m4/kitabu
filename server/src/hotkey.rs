use global_hotkey::HotKeyState::Pressed;
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyEvent, GlobalHotKeyManager,
};
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tokio::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use chrono;
use std::env;

use crate::messages::create_hotkey_message;
use crate::websocket::WebSocketService;

pub struct HotkeyManager {
    manager: GlobalHotKeyManager,
    websocket_service: Arc<WebSocketService>,
    is_recording: Arc<AtomicBool>,
}

impl HotkeyManager {
    pub fn new(websocket_service: Arc<WebSocketService>) -> Result<Self, Box<dyn std::error::Error>> {
        let manager = GlobalHotKeyManager::new()?;
        Ok(Self { 
            manager, 
            websocket_service,
            is_recording: Arc::new(AtomicBool::new(false)),
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


    async fn toggle_audio_recording(&self) {
        let currently_recording = self.is_recording.load(Ordering::SeqCst);
        
        if currently_recording {
            self.stop_audio_recording().await;
        } else {
            self.start_audio_recording().await;
        }
    }

    async fn start_audio_recording(&self) {
        if self.is_recording.load(Ordering::SeqCst) {
            return;
        }

        self.is_recording.store(true, Ordering::SeqCst);
        
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let tmp_dir = env::temp_dir();
        let filename = tmp_dir.join(format!("audio_recording_{}.mp3", timestamp));
        let filename_str = filename.to_string_lossy().to_string();
        
        let recording_state = self.is_recording.clone();
        
        tokio::spawn(async move {
            let child = Command::new("ffmpeg")
                .arg("-f")
                .arg("pulse")
                .arg("-i")
                .arg("@DEFAULT_MONITOR@")
                .arg("-c:a")
                .arg("libmp3lame")
                .arg("-b:a")
                .arg("192k")
                .arg("-ar")
                .arg("44100")
                .arg("-y")
                .arg(&filename_str)
                .spawn();

            match child {
                Ok(mut process) => {
                    let _ = Command::new("notify-send")
                        .arg("Audio Recording")
                        .arg(&format!("Started recording: {}", filename_str))
                        .spawn();
                    
                    let _ = process.wait().await;
                    
                    if recording_state.load(Ordering::SeqCst) {
                        recording_state.store(false, Ordering::SeqCst);
                        let _ = Command::new("notify-send")
                            .arg("Audio Recording")
                            .arg(&format!("Completed: {}", filename_str))
                            .spawn();
                    }
                }
                Err(e) => {
                    recording_state.store(false, Ordering::SeqCst);
                    let _ = Command::new("notify-send")
                        .arg("Audio Recording Error")
                        .arg(&format!("Failed to start recording: {}", e))
                        .spawn();
                }
            }
        });
    }

    async fn stop_audio_recording(&self) {
        if !self.is_recording.load(Ordering::SeqCst) {
            return;
        }

        self.is_recording.store(false, Ordering::SeqCst);
        
        let _ = Command::new("pkill")
            .arg("-f")
            .arg("ffmpeg.*pulse.*@DEFAULT_MONITOR@")
            .spawn();
        
        let _ = Command::new("notify-send")
            .arg("Audio Recording")
            .arg("Recording stopped")
            .spawn();
    }

    pub async fn start_listening(&self) {
        let receiver = GlobalHotKeyEvent::receiver();
        loop {
            if let Ok(event) = receiver.try_recv() {
                if event.state == Pressed {
                    match event.id {
                        id if id == HotKey::new(Some(Modifiers::ALT), Code::KeyA).id() => {
                            let message = create_hotkey_message().await;
                            self.websocket_service.send_message_to_clients(message.clone()).await;
                            println!("Hotkey pressed - Alt+A");
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