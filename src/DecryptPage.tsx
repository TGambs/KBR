import { useEffect, useState } from "react";
import type { Vault } from "./vault";
import { generateKey, deleteKey, listKeys, renameKey, type KeyMeta, getSecretKey } from "./keystore";
import { invoke } from "@tauri-apps/api/core";


type Props = {vault: Vault};


function DecryptPage({vault}: Props){

    const [keys, setKeys] = useState <KeyMeta[]>([]);
    const [keyId, setKeyId] = useState("");
    const [blob, setBlob] = useState("");
    const [result, setResult] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");


    useEffect(() => {

        listKeys(vault)
            .then((ks) => {
                setKeys(ks);
                if (ks.length > 0) setKeyId(ks[0].id);
            })
            .catch((e) => setError(String(e)));

    }, [vault]);

    async function handleDecrypt(){

        setError("");
        setResult("");
        setBusy(true);

        let secretKey: number[] | null = null;
        try{
            secretKey = await getSecretKey(vault, keyId);
            const text = await invoke<string>("decrypt_message", { secretKey, blob});
            setResult(text);
        }catch(e){
            setError(String(e));
        }finally {
            if (secretKey) secretKey.fill(0); // best effort at hiding the secret key from the JS 
            setBusy(false);
        }
    }

    return (
        <>
            <h1>Decrypt Page</h1>

            {keys.length === 0 ? (

                <p className="emptyState">No keys yet - please make or import a key pair to get started</p>
            ) : (
                <>

                    <label className="cryptoField">
                        Decrypt Key
                        <select value={keyId} onChange={(e) => setKeyId(e.target.value)}>
                            {keys.map((k) => (
                                <option key={k.id} value={k.id}>{k.name}</option>
                            ))}
                        </select>
                    </label>
            )

            
    );



}

export default DecryptPage;