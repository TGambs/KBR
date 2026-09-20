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
    const [notice, setNotice] = useState("");

    useEffect(() => {
        listKeys(vault).then(setKeys).catch((e) => setError(String(e)));
    }, [vault]);

    useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);


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
            
            const current = await listKeys(vault);
            const typed = newName.trim();

            const taken = (n: string) =>
                current.some((k) => k.name.trim().toLowerCase() === n.trim().toLowerCase());

            let name: string;

            if (typed && !taken(typed)) {
                name = typed;
            }else{
                let highest = 0;
                for (const k of current){
                    const match = /^Key (\d+)$/.exec(k.name.trim());
                    if (match){
                        const n = Number(match[1]);
                        if(n>highest) highest = n;
                    }
                }

                name = `Key ${highest + 1}`;

                if(typed){
                    setNotice(`"${typed}" is already in use - named it "${name}" instead.`);
                }
            }

            await generateKey(vault, name);
            setNewName("");

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

            <div className="errorDiv">
                {error && <p className="formError">{error}</p>}
                {notice && <p className="formError">{notice}</p>}
            </div>
            

            {keys.length === 0 ? (
                <p className="emptyState">No keys yet - Generate one to get started</p>
            ) : (
                <ul className="keyList">
                    {keys.map((k) => (

                        // Each key gets its own "card" - split into Header(key meta)-KeyValue-KeyActions(copy,rename,delete)
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
                                    <strong>{k.name}  -  </strong>
                                )}

                                <span className="keyMeta">
                                    <i>{k.algorithm} · {new Date(k.createdAt).toLocaleString()}</i>
                                </span>
                            </div>

                            {/* Only show the first 30 characters of the public key */}
                            <code className="keyValue" title={k.publicKey}>{k.publicKey.slice(0, 30)}...</code> 

                            <div className="keyActions">
                                <button className="btnPrimary-info" onClick={() => handleCopy(k)}>
                                    {copiedId === k.id ? "Copied!" : "Copy public key"}
                                </button>

                                {editingId === k.id ? (
                                    <>
                                        <button className="btnPrimary" disabled={busy} onClick={() => handleRename(k.id)}>Save</button>
                                        <button className="btnPrimary-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                                    </>
                                ) : (
                                    <button className="btnPrimary" onClick={() => {setEditingId(k.id); setEditName(k.name);}}>Rename</button>
                                )}


                                {confirmDeletedId === k.id ? (
                                    <>
                                        <button className="btnPrimary-delete" disabled={busy} onClick={() => handleDelete(k.id)}>Confirm Delete</button>
                                        <button className="btnPrimary-cancel" onClick={() => setConfirmDeletedId(null)}>Cancel</button>
                                    </>
                                ) : (
                                    <button className="btnPrimary-delete" onClick={() => setConfirmDeletedId(k.id)}>Delete</button>
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
