use std::env;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_WEB_URL: &str = "https://itestu.uz";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let web_url = env::var("WEB_APP_URL").unwrap_or_else(|_| DEFAULT_WEB_URL.to_string());

            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(web_url.parse().expect("invalid WEB_APP_URL")),
            )
            .title("iTestU")
            .inner_size(1280.0, 860.0)
            .min_inner_size(1024.0, 700.0)
            .build()?;

            let handle = app.handle().clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    let _ = handle.emit("itestu:window-close", ());
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running iTestU desktop");
}
