import {useState } from "react";
import { invoke } from "@tauri-apps/api/core";


function EncryptPage() {
    const [publicKey, setPublicKey] = useState("");
    const [message, setMessage] = useState("");
    const [result, setResult] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);


    async function handleEncrypt(){

        setError("");
        setResult("");
        setBusy(true);

        try{
            const blob = await invoke<string>("encrypt_message", {
                recipientPublicKey: publicKey.trim(),
                message,
            });
            setResult(blob);
        }catch (e) {
            setError(String(e));
        }finally{
            setBusy(false);
        }
    }

    async function handleCopy(){
        try{
            await navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }catch{
            setError("Could not copy to clipboard");
        }
    }


    return (
        <>

            <h1>Encrypt</h1>

            <label className="cryptoField">
                Recipient's Public Key
                <textarea
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    rows={3}
                    placeholder="Paste the recipient's ML-KEM-768 public key here"
                />
            </label>

            <label className="cryptoField">
                Message
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows= {6}
                    placeholder="Message to be encrypted here"
                />
            </label>

            <button
                className="btnPrimary"
                disabled = {busy || !publicKey.trim() || !message}
                onClick={handleEncrypt}
            >
                {busy ? "Encrypting..." : "Encrypt"}
            </button>


            {error && <p className="formError">{error}</p>}


            {result && (
                <label className="cryptoField">
                    Encrypted Message
                    <textarea value={result} readOnly rows={6}/>
                    <button className="btnPrimary-info" onClick={handleCopy}>
                        {copied ? "Copied" : "Copy encrypted message"}
                    </button>
                </label>
            )}
        </>
    );
}


export default EncryptPage;