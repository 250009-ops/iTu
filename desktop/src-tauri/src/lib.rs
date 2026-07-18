use std::env;
use tauri::{WebviewUrl, WebviewWindowBuilder};

const DEFAULT_WEB_URL: &str = "https://www.itestu.uz";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let web_url =
                env::var("WEB_APP_URL").unwrap_or_else(|_| DEFAULT_WEB_URL.to_string());
            let parsed = web_url
                .parse()
                .map_err(|_| format!("invalid WEB_APP_URL: {web_url}"))?;

            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
                .title("iTestU")
                .inner_size(1280.0, 860.0)
                .min_inner_size(1024.0, 700.0)
                .center()
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running iTestU desktop");
}
