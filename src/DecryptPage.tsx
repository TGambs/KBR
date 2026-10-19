import { useEffect, useState } from "react";
import type { Vault } from "./vault";
import {listKeys, type KeyMeta, getSecretKey } from "./keystore";
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

    // page logic ^


    // what actually shows on the page
    return (
        <>
            <h1>Decrypt Page</h1>

            {keys.length === 0 ? (
                <p className="emptyState">No keys yet - please make or import a key pair to get started</p>
            ) : (
                <>

                    <div id="decMainPanel">

                        <div className="decPanelPart">
                            <p className="p1"><b>Decrypt Key</b></p>
                            <label className="cryptoField">
                                <select className="cryptoSelect" value={keyId} onChange={(e) => setKeyId(e.target.value)}>
                                    {keys.map((k) => (
                                        <option key={k.id} value={k.id}>{k.name}</option>
                                    ))}
                                </select>
                            </label>
                        </div>


                        <div className="decPanelPart">
                            <p className="p1"><b>Encrypted Message</b></p>
                            <label className="cryptoField">
                                <textarea
                                    value={blob}
                                    onChange={(e) => setBlob(e.target.value)}
                                    rows={6}
                                    placeholder="Paste encrpted message here"
                                    />
                            </label>
                        </div>


                        <div className="decPanelPart">
                            <button
                                className="btnPrimary" id="encButton"
                                disabled={busy || !keyId || !blob.trim()}
                                onClick={handleDecrypt}
                            >
                                {busy ? "Decrypting..." : "Decrypt"}
                            </button>
                        </div>


                        {error && (
                            <div id="decErrorPart">
                                {error && <p className="formError">{error}</p>}
                            </div>
                        )}


                        {result && (
                            <div className="decPanelPart">
                                <p className="p1">Decrypted Message</p>
                                <label className="cryptoField">
                                    <textarea value={result} readOnly rows={6}/>
                                </label>
                            </div>
                        )}
                        

                    </div>

                    
                </>
            )}
        </>       
    );
}

export default DecryptPage;