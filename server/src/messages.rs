use flatbuffers::FlatBufferBuilder;

#[allow(dead_code, unused_imports, unsafe_code, unsafe_op_in_unsafe_fn)]
use crate::messages_generated;
pub use messages_generated::protocol::*;
use crate::paddle_ocr_service::PaddleOCRService;

pub struct MessageService {
    ocr_service: PaddleOCRService,
}

impl MessageService {
    pub fn new() -> Self {
        Self {
            ocr_service: PaddleOCRService::new(),
        }
    }

    pub async fn handle_flatbuffer_message(&self, data: &[u8]) -> Option<Vec<u8>> {
        let message = flatbuffers::root::<Message>(data).ok();
        if message.is_some() {
            self.handle_request(message.unwrap()).await
        }
        else {
            None
        }
    }

    async fn handle_request(&self, message: Message<'_>) -> Option<Vec<u8>> {
        println!("Message received: {}", message.data_type().variant_name().unwrap_or("failed"));
        match message.data_type() {
            MessageData::InitializationMessage => {
                Some(create_initialization_response(message.id()).await)
            },
            MessageData::ResponseScreenShot => {
                self.handle_screenshot_for_ocr(message.data_as_response_screen_shot().unwrap()).await
            }
            _ => None,
        }
    }

    async fn handle_screenshot_for_ocr(&self, data: ResponseScreenShot<'_>) -> Option<Vec<u8>> {
        let mut builder = FlatBufferBuilder::new();

        let image_data = data.image()?.bytes().to_vec();
        let ocr_result = self.ocr_service.recognize(image_data);
        
        let ocr_text = builder.create_string(&ocr_result);
        let ocr_message = OCRMessage::create(&mut builder, &OCRMessageArgs {
            key: None,
            text: Some(ocr_text),
        });

        let message = Message::create(&mut builder, &MessageArgs {
            id: 0,
            data_type: MessageData::OCRMessage,
            data: Some(ocr_message.as_union_value()),
        });

        builder.finish(message, None);
        Some(builder.finished_data().to_vec())
    }
}

pub async fn create_initialization_response(request_id: u64) -> Vec<u8> {
    let mut builder = FlatBufferBuilder::new();
    
    // For now, create an empty response since ResponseData doesn't have an initialization response type
    // We'll just acknowledge with the same ID
    let response = Message::create(&mut builder, &MessageArgs {
        id: request_id,
        data_type: MessageData::NONE,
        data: None,
    });
    
    builder.finish(response, None);
    builder.finished_data().to_vec()
}

pub async fn create_hotkey_message() -> Vec<u8> {
    let mut builder = FlatBufferBuilder::new();
    
    // Create a message indicating hotkey was pressed
    let response = Message::create(&mut builder, &MessageArgs {
        id: 0, // Using 0 for hotkey-triggered messages
        data_type: MessageData::RequestScreenshot,
        data: None,
    });
    
    builder.finish(response, None);
    builder.finished_data().to_vec()
}