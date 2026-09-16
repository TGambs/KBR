use tauri::Manager;

mod auth;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())

        .setup(|app| {
            let salt_path = app
                .path() //finds tauri's path resolver
                .app_local_data_dir() //resolves LocalAppData
                .expect("Could not resolve app local data path") //stops the app with this error if the folder cant be found
                .join("salt.txt"); //adds the salt file name to the end of the path
            app.handle().plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?; // registers Stronghold, making pwords into keys with Argon+salt
            Ok(()) //tells tauri to setup
        })

        .manage(auth::Session::default()) // saves an empty session into Tauris shared state

        .invoke_handler(tauri::generate_handler![ //sets the commands that rust is allowed to run
            auth::account_status, // account exists?
            auth::register, // create account
            auth::login, // checks pword and starts session
            auth::logout // ends session
        ])

        .run(tauri::generate_context!())

        .expect("Error while running tauri application");
}
