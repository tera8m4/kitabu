use image::{DynamicImage, ImageResult};
use rust_paddle_ocr::OcrEngineManager;
use std::sync::Mutex;

pub struct PaddleOCRService {
    mutex: Mutex<()>,
}

static DET_MODEL: &[u8] = include_bytes!("../models/PP-OCRv5_mobile_det_fp16.mnn");
static REC_MODEL: &[u8] = include_bytes!("../models/PP-OCRv5_mobile_rec_fp16.mnn");
static KEYS_DATA: &[u8] = include_bytes!("../models/ppocr_keys_v5.txt");


impl PaddleOCRService {
    pub fn new() -> Self {
        OcrEngineManager::initialize_with_config_and_bytes(
            DET_MODEL, REC_MODEL, KEYS_DATA, 12,    // rect_border_size
            false, // merge_boxes
            1,     // merge_threshold
        ).unwrap();
        Self{
            mutex: Mutex::new(()),
        }
    }

    pub fn recognize(&self, image_data: Vec<u8>) -> String {
        let _lock = self.mutex.lock().unwrap();
        let dynamic_image: ImageResult<DynamicImage> = image::load_from_memory(image_data.as_slice());
        if dynamic_image.is_err() {
            return "Failed to read image".to_string();
        }
        let texts = OcrEngineManager::process_ocr(dynamic_image.unwrap());
        if texts.is_err() {
            return "Failed to OCR image".to_string();
        }
        texts.unwrap().join("\n")
    }
}