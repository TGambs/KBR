use base64::{engine::general_purpose::STANDARD, Engine}; //base64 encoder
use ml_kem::{EncodedSizeUser, KemCore, MlKem768}; // for ML KEM 768 usage
use serde::Serialize;
use tauri::State;

//use the login func from auth.rs
use crate::auth::{require_login, Session};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]

//define key pair structure
pub struct GeneratedKeyPair{
    public_key: String, // encap key used as base64 chars 
    secret_key: Vec<u8>, // decap key must stay private so keep as bytes and put in stronghold
}


#[tauri::command]
pub fn generate_mlkem_keypair(session: State<Session>) -> Result<GeneratedKeyPair, String>{

    require_login(&session)?; //refuse if no login detected

    // os based rng 
    let mut rng = rand::thread_rng();

    // ek = encap , dk = decap
    let (dk, ek) = MlKem768::generate(&mut rng);

    Ok(GeneratedKeyPair {
        public_key: STANDARD.encode(ek.as_bytes().as_slice()), //public encap key being passed as base64 for usage
        secret_key: dk.as_bytes().as_slice().to_vec(), // secret encap key passed as raw bytes
    })
}
