
import { Client, Stronghold } from "@tauri-apps/plugin-stronghold"; // Stronghold classes from the plugin
import { appLocalDataDir, join } from "@tauri-apps/api/path"; // helpers for building file paths

export type Vault = { stronghold: Stronghold; client: Client }; // the handle other pages will use to store keys

const CLIENT_NAME = "kbr"; // name of the storage area inside the vault file

export async function openVault(password: string): Promise<Vault> { // opens (or creates) the vault with the password
    const vaultPath = await join(await appLocalDataDir(), "vault.hold"); // builds %LOCALAPPDATA%\<identifier>\vault.hold
    const stronghold = await Stronghold.load(vaultPath, password); // decrypts the vault file (creates it if missing)

    let client: Client; // will hold the storage area once found or created
    try { // attempts to load an existing client
        client = await stronghold.loadClient(CLIENT_NAME); // succeeds on normal logins
    } catch { // fails on the very first run, when nothing exists yet
        client = await stronghold.createClient(CLIENT_NAME); // creates the storage area
        await stronghold.save(); // writes the new vault to disk
    }
  return { stronghold, client }; // hands both back to the caller
}

export async function closeVault(vault: Vault) { // safely closes the vault on logout
    await vault.stronghold.save(); // writes any unsaved changes to disk
    await vault.stronghold.unload(); // removes the decrypted vault from memory
}