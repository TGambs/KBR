
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import LoginPage from "./LoginPage";
import { closeVault, type Vault } from "./vault";


function App() {

  const [activePage, setActivePage] = useState<string>("pg1"); // used for changing which div to show - default is pg1
  const [user, setUser] = useState<string | null>(null);
  const [vault, setVault] = useState<Vault | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  //Login function
  function handleLogin(username: string, v: Vault){
    setUser(username);
    setVault(v);
    setNotice(null);
    setActivePage("pg2");
  }

  //Logout function
  async function logout() {
    await invoke("logout");
    if (vault) await closeVault(vault);
    setVault(null);
    setUser(null);
    setActivePage("pg1");
  }

  

  return (
    <main className="container">

      <div id="taskbar">
        <p id="tbTitle">KBR</p>
        <div id="taskbarBtns">
          <button id="tbBt1" className={activePage === "pg1" ? "active" : ""} onClick={() => setActivePage("pg1")}>Login</button>
          <button id="tbBt2" className={`${activePage === "pg2" ? "active" : ""} ${!user ? "locked" : ""}`} onClick={() => user ? setActivePage("pg2") : setNotice("Please log in to access Key Pair Gen.")}>Key Pair Gen</button>
          <button id="tbBt3" className={`${activePage === "pg3" ? "active" : ""} ${!user ? "locked" : ""}`} onClick={() => user ? setActivePage("pg3") : setNotice("Please log in to access Page 3.")}>Page3</button>
        </div>
      </div>

      {/* popup only rendered when there is a message*/}
      {notice && <div id="notice">{notice}</div>}

      
      {activePage === "pg1" && (
        <div id="pg1Main">
          <h1>Page 1</h1>
          {user ? (
            <>
              <h1>Logged in as {user}</h1>
              <button onClick={logout}>Log Out</button>
            </>
          ) : (
            <LoginPage onLogin={handleLogin} />
          )}
        </div>
      )}{/* end of page 1 */}


      {activePage === "pg2" && (
        <div id="pg2Main">
          <h1>Page 2</h1>
        </div>
      )}{/* end of page 2 */}


      {activePage === "pg3" && (
        <div id="pg3Main">
          <h1>Page 3</h1>
        </div>
      )}{/* end of page 3 */}

    </main>
  );
}

export default App;
