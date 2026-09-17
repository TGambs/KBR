import { invoke } from "@tauri-apps/api/core"; // allows for rust commands
import type {Vault } from "./vault"; // allows for Stronghold usage


// type structure for what the front end can see about the key
export type KeyMeta = {
    id: string; // unique id for finding sk record
    name: string; // user friendly lable
    algorithm: "ML-KEM-768";
    publicKey: string;
    createdAt: string;
}

//define constants
const INDEX_KEY = "mlkem:index";
const skRecord = (id: string) => `mlkem:sk:${id}`;
const MAX_NAME_LEN = 50; 
const encoder = new TextEncoder(); // text to bytes
const decoder = new TextDecoder(); // bytes to text


// validate and trim name given
function cleanName(name: string): string {

    const trimmed = name.trim();

    if (!trimmed){
        throw new Error("Key name is required"); //dont allow for blank names
    }
    if (trimmed.length > MAX_NAME_LEN){
        throw new Error(`Key name too large - must be less than ${MAX_NAME_LEN} characters`);
    }

    return trimmed;
}

// lists all keys
export async function listKeys(vault: Vault): Promise<KeyMeta[]>{

    const raw = await vault.client.getStore().get(INDEX_KEY); // open vault and try get keys
    return raw ? (JSON.parse(decoder.decode(raw)) as KeyMeta[]) : [] // retuns decoded key or empty list if no keys in vault
}

//replace key list
async function writeIndex(vault: Vault, keys: KeyMeta[]){

    const bytes = encoder.encode(JSON.stringify(keys)); //get keys in bytes
    await vault.client.getStore().insert(INDEX_KEY, Array.from(bytes)); 
}

// create new key pair andsave to vault
export async function generateKey(vault: Vault, name: string): Promise<KeyMeta>{

    const label = cleanName(name);
    const pair = await invoke<{ publicKey: String; secretKey: number[] }>("generate_mlkem_keypair");

    //define new key
    const meta: KeyMeta = {
        id: crypto.randomUUID(), // random id number
        name: label,
        algorithm: "ML-KEM-768",
        publicKey: String(pair.publicKey), // only show the public
        createdAt: new Date().toISOString(), // add current date + time
    }

    // for private key
    const store = vault.client.getStore(); // get current vault storage
    await store.insert(skRecord(meta.id), pair.secretKey); //insert new record of id and secret key to list
    pair.secretKey.fill(0); // overwrites the JS copy of the secret key - trying to stay secure

    // for public key
    const keys = await listKeys(vault);
    await writeIndex(vault, [...keys, meta]); // adds new key to list
    await vault.stronghold.save(); // encrypts and writes vault to disk
    return meta;
}


//rename key function
export async function renameKey(vault: Vault, id: string, newName: string){
    const label = cleanName(newName); //validate new name
    const keys = await listKeys(vault); // get current key list
    await writeIndex(vault, keys.map((k) => (k.id === id ? { ...k, name: label } : k))); //overwrite key label with matching id
    await vault.stronghold.save(); // update vault
}


export async function deleteKey(vault: Vault, id: string){
    await vault.client.getStore().remove(skRecord(id));
    const keys = await listKeys(vault);
    await writeIndex(vault ,keys.filter((k) => k.id !== id));
    await vault.stronghold.save();
}