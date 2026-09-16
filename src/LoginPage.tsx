
import { useEffect, useState, type SyntheticEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openVault, type Vault } from "./vault.ts";

type Status = {exists: boolean; username: string | null };

type Props = { onLogin: (username: string, vault: Vault) => void;}

const MIN_PWORD_LEN = 12;


function LoginPage({ onLogin }: Props) {
    const [status, setStatus] = useState<Status | null>(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        invoke<Status>("account_status")
            .then((s) => {
                setStatus(s);
                if (s.username) setUsername(s.username);
            })
            .catch((e) => setError(String(e)));
    }, []);

    const isRegister = status !== null && !status.exists;


    async function handleSubmit(e: SyntheticEvent<HTMLFormElement>){
        e.preventDefault();
        setError(null);

        if(isRegister){
            if(password.length < MIN_PWORD_LEN){
                setError(`Password must be at least ${MIN_PWORD_LEN} characters.`);
                return;
            }
            if (password !== confirm) {
                setError("Passwords do not match.");
                return;
            }
        }

        setBusy(true);
        try{
            await invoke(isRegister ? "register" : "login", { username, password });
            const vault = await openVault(password);
            setPassword("");
            setConfirm("");
            onLogin(username.trim(), vault);

        } catch (err) {
            await invoke("logout").catch(() => {});
            setError(String(err));

        } finally {
            setBusy(false);
        }
    }

    //write the main form on pg1
    return (
    <div id="pg1Main">
        <h1>{isRegister ? "Create your account" : "Log in"}</h1> {/* heading changes with mode */}

        <form className="authForm" onSubmit={handleSubmit}>
            <div id="loginUserN">
                <label>
                    Username
                    <input
                    value={username} // shows the username - if there is one already
                    onChange={(e) => setUsername(e.target.value)} // updates state as the user types
                    autoComplete="username" // hint for password manager
                    required //blocks submitting when empty
                    />
                </label>
            </div>

            <div id="loginPwrd1st">
                <label>
                    Password
                    <input
                    type="password" // hides the typed characters
                    value={password} // shows the current state value
                    onChange={(e) => setPassword(e.target.value)} // updates state as the user types
                    autoComplete={isRegister ? "new-password" : "current-password"} // correct hint for each mode
                    required //blocks submitting when empty
                    />
                </label>
            </div>


            {isRegister && ( // only show the confirm field when registering
                <div id="loginPwrd2nd">
                    <label>
                        Confirm password
                        <input
                        type="password" // hides the typed characters
                        value={confirm} // shows the current state value
                        onChange={(e) => setConfirm(e.target.value)} // updates state as the user types
                        autoComplete="new-password" // hint that this is a new password
                        required // browser blocks submitting when empty
                        />
                    </label>
                </div>
            )}

            {error && <p className="formError">{error}</p>} {/* shows error if there is one */}

            <button type="submit" disabled={busy}>{/* submits the form - disabled while busy */}
            {busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}{/* label depends on state and mode */}
            </button>
        </form>
    </div>
    );

}

export default LoginPage; //make this page available for App.tsx