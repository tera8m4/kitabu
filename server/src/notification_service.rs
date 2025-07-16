use notify_rust::Notification;
static ICON: &[u8] = include_bytes!("../../assets/icon.png");

pub fn send_notification(message: &str) {
    // i couldn't figure out how to pass the image
    let notification_icon = image::load_from_memory(ICON).unwrap();
    let width = notification_icon.width() as i32;
    let height = notification_icon.height() as i32;
    let image_data = notification_icon.as_rgb8().unwrap().to_vec().clone();

    Notification::new()
        .summary("Kitabu")
        .body(message)
        .image_data(notify_rust::Image::from_rgb(width, height, image_data).unwrap())
        .show()
        .unwrap();
}
