
//for key pair gen
use base64::{engine::general_purpose::STANDARD, Engine}; //base64 encoder
use ml_kem::{EncodedSizeUser, KemCore, MlKem768, SharedKey}; // for ML KEM 768 usage
use serde::Serialize;
use tauri::State;

//for en/decryption
use aes_gcm::aead::{Aead, AeadCore, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce}; //AES general functionalities
use hkdf::Hkdf;
use ml_kem::kem::{Encapsulate, Decapsulate}; // KEM functions
use ml_kem::array::Array; // array type needed by ml-kem
use sha2::Sha256; //Hash

// ---------------------------------------------------------------------------------

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


//---------------------------------------------------------------------------------


const VERSION: u8 = 1;  // format version
const KEM_CT_LEN: usize = 1088;  // mlkem 768 cipher size
const NONCE_LEN: usize = 12;  // aes gcm nonce size
const HKDF_INFO: &[u8] = b"KBR ML-KEM-768 AES-256-GCM v1"; // context label to bind the key to this app and format


// calculates AES key from shared secret
fn derive_aes_key(shared_secret: &[u8]) -> Result<[u8; 32], String> {
    let hk = Hkdf::<Sha256>::new(None, shared_secret);
    let mut key = [0u8; 32];
    hk.expand(HKDF_INFO, &mut key).map_err(|_| "Key derivation failed.".to_string())?;
    Ok(key)
}


#[tauri::command]
pub fn encrypt_message(
    session: State<Session>,
    recipient_public_key: String,
    message: String,
) -> Result<String, String> {

    require_login(&session)?; //ensure user is logged in

    if message.is_empty(){
        return Err("Message is empty.".into()); // ensure message has a value
    }

    // validate recipient's pk
    let ek_bytes = STANDARD
        .decode(recipient_public_key.trim())
        .map_err(|_| "Public key is not a valid base64.".to_string())?;

    let ek_array = Array::try_from(&ek_bytes[..])
        .map_err(|_| "Public key is the wrong length for ML-KEM-768.".to_string())?;

    let ek = <MlKem768 as KemCore>::EncapsulationKey::from_bytes(&ek_array);


    // - - - encapsulate - - -
    let mut rng = rand::thread_rng();
    let(kem_ct, shared_secret) = ek
        .encapsulate(&mut rng)
        .map_err(|_| "Encapsulation Failed".to_string())?;


    // - - - calculate aes key can encrypt - - -
    let aes_key = derive_aes_key(&shared_secret)?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&aes_key));
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ct = cipher
        .encrypt(&nonce, message.as_bytes())
        .map_err(|_| "Encryption Failed".to_string())?;


    // - - - assemble all componants - - - ( version + ciphertext + nonce + aes ciphertext+tag )
    let mut blob = Vec::with_capacity(1 + KEM_CT_LEN + NONCE_LEN + ct.len());
    blob.push(VERSION);
    blob.extend_from_slice(&kem_ct);
    blob.extend_from_slice(&nonce);
    blob.extend_from_slice(&ct);


    Ok(STANDARD.encode(&blob))
}