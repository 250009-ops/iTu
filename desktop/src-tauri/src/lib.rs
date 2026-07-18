use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("main window not found in tauri.conf.json");

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
