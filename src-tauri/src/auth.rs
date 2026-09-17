
use argon2::{ Argon2, password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString}
};

use serde::Serialize; // for converting rust to json
use serde_json::json; // for building JSON values
use std::sync::Mutex; // a lock for thread handling
use tauri::{AppHandle, State}; // for access to app and managed data
use tauri_plugin_store::StoreExt; // adds the store method

// - - Constants - - 
const AUTH_STORE: &str = "auth.json"; // filename for holding account details
const MIN_PWORD_LEN: usize = 12; // minimum password length


// - - Session - -
#[derive(Default)] //create empty session
pub struct Session(pub Mutex<Option<String>>);

#[derive(Serialize)] // lets struct to be sent to react as json
pub struct AccountStatus { // the reply to account_status call
    exists: bool,
    username: Option<String>,
}

// Auth Store to Text 
fn stored_string(app: &AppHandle, key: &str) -> Result<Option<String>, String> { // reads text value from auth store
    let store = app.store(AUTH_STORE).map_err(|e| e.to_string())?; //opens auth.json
    Ok(store.get(key).and_then(|v| v.as_str().map(String::from))) // gets value and returns it if its a string
}


// Checks if device has a login already - if not show register page
#[tauri::command]
pub fn account_status(app: AppHandle) -> Result<AccountStatus, String>{ //returns account status or error
    let username = stored_string(&app, "username")?; // reads saved username
    Ok(AccountStatus { //build reply
        exists: username.is_some(),
        username,
    })
}


// for registering new device account
#[tauri::command]
pub fn register(
    app: AppHandle,
    session: State<Session>,
    username: String,
    password: String,
) -> Result<(), String>{
    let username = username.trim().to_string(); //removes whitespace
    if username.is_empty(){ //validate password
        return Err("Username is required.".into());
    }

    if password.chars().count() < MIN_PWORD_LEN{ //validate password length
        return Err(format!("Password must be at least {MIN_PWORD_LEN} characters"));
    }

    if stored_string(&app, "username")?.is_some(){ //check if account already exists
        return Err("An account already exists on this device.".into());
    }

    let salt = SaltString::generate(&mut rand::thread_rng()); // create random salt for the account
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt) // hashes password with salt
        .map_err(|e| e.to_string())? //makes errors into text
        .to_string(); // algorithm + settings + salt + hash

    let store = app.store(AUTH_STORE).map_err(|e| e.to_string())?; //opens auth.jso
    store.set("username", json!(username)); //save username
    store.set("password_hash", json!(hash)); // save hash value
    store.save().map_err(|e| e.to_string())?; // write changes to disk

    *session.0.lock().map_err(|_| "Session error")? = Some(username); //locks session to user

    Ok(())
}



// for logging in
#[tauri::command]
pub fn login(
    app: AppHandle,
    session: State<Session>,
    username: String,
    password: String,
) -> Result<(), String>{

    let stored_user = stored_string(&app, "username")?.ok_or("No account on this device")?; // gets username - returns error is no account
    let stored_hash = stored_string(&app, "password_hash")?.ok_or("Account data is corrupted.")?; // gets password hash - returns error if hash is missing

    let parsed = PasswordHash::new(&stored_hash).map_err(|e| e.to_string())?;
    let password_ok = Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok();
    
    if username.trim() != stored_user || !password_ok {
        return Err("Incorrect username or password.".into());
    }

    *session.0.lock().map_err(|_| "Session error")? = Some(stored_user);
    Ok(())
}


// logout of session
#[tauri::command]
pub fn logout(session: State<Session>) -> Result<(), String>{
    *session.0.lock().map_err(|_| "Session error")? = None; //clears logged in user
    Ok(())
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// logged in checker
pub fn require_login(session: &Session) -> Result<String, String> {
    session
        .0 //define thread inside session
        .lock() // locks thread
        .map_err(|_| "Session error".to_string())? //turns error to text
        .clone() // copies the Option<String> output
        .ok_or_else(|| "Not logged in.".to_string())
}