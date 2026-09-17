import { useEffect, useState } from "react";
import type { Vault } from "./vault";
import { generateKey, deleteKey, listKeys, renameKey, type KeyMeta } from "./keystore";


type Props = { vault: Vault }; // app passes in the open vault


function KeysPage({ vault }: Props){

    const [keys, setKeys] = useState<KeyMeta[]>([]);
    const [newName, setNewName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [confirmDeletedId, setConfirmDeletedId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        listKeys(vault).then(setKeys).catch((e) => setError(String(e)));
    }, [vault]);


    async function run(action: () => Promise<void>){
        setError(null); //clears old error msgs
        setBusy(true); // disables new user inputs

        try{
            await action();
            setKeys(await listKeys(vault));
        }catch (e) {
            setError(e instanceof Error ? e.message : String(e)); //show error
        } finally {
            setBusy(false); // allows user input
        }
    }


    // for key generation
    function handleGenerate() {
        run(async () => {
            await generateKey(vault, newName.trim() || `Key ${keys.length + 1}`); //calls key gen function
            setNewName(""); //clears text field
        })
    }

    //for key rename
    function handleRename(id: string){
        run(async () => {
            await renameKey(vault, id, editName); //calls rename function
            setEditingId(null);
        })
    }

    //for key deletion
    function handleDelete(id: string){
        run(async () => {
            await deleteKey(vault, id); //calls delete function
            setConfirmDeletedId(null);
        })
    }


    // for copying pk to clipboard
    async function handleCopy(k: KeyMeta){
        try {
            await navigator.clipboard.writeText(k.publicKey); //write in clipboard
            setCopiedId(k.id);
            setTimeout(() => setCopiedId(null), 2000); // reset copied id
        } catch {
            setError("Could not copy to clipboard.") // display err if clipboard is unavailable
        }
    }

    
    //html for UI
    return (
        <>
            <h1>My Keys</h1>

            <form className="keyform" onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>

                <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Key name (optional)"
                    maxLength={50} // MUST MATCH KEYSTORE LIMIT
                />

                <button type="submit" className="btn btnPrimary" disabled={busy}>
                    {busy ? "Working..." : "Generate ML-KEM key pair"}
                </button>

            </form>

            {error && <p className="forError">{error}</p>}

            {keys.length === 0 ? (
                <p className="emptyState">No keys yet - Generate one to get started</p>
            ) : (
                <ul className="keyList">
                    {keys.map((k) => (
                        <li key={k.id} className="keyCard">
                            <div className="keyHeader">
                                {editingId === k.id ? (
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        maxLength={50}
                                        autoFocus
                                    />
                                ) : (
                                    <strong>{k.name}</strong>
                                )}

                                <span className="keyMeta">
                                    {k.algorithm} · {new Date(k.createdAt).toLocaleString()}
                                </span>
                            </div>

                            <code className="keyValue" title={k.publicKey}>{k.publicKey}</code>

                            <div className="keyActions">
                                <button className="btn" onClick={() => handleCopy(k)}>
                                    {copiedId === k.id ? "Copied!" : "Copy public key"}
                                </button>

                                {editingId === k.id ? (
                                    <>
                                        <button className="btn btnPrimary" disabled={busy} onClick={() => handleRename(k.id)}>Save</button>
                                        <button className="btn" onClick={() => setEditingId(null)}>Cancel</button>
                                    </>
                                ) : (
                                    <button className="btn" onClick={() => handleDelete(k.id)}>Delete</button>
                                )}

                            </div>

                        </li>

                    ))}

                </ul>

            )}

        </>

    )

}

export default KeysPage;
