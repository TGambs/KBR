import { useState } from "react";
import "./App.css";

function App() {
  /*
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  */
 const [activePage, setActivePage] = useState<string>("pg1"); // used for changing which div to show


  return (
    <main className="container">
      
      <div>
        <h1>Welcome to KBR</h1>
      </div>

      <div id="taskbar">
        <p id="tbTitle">KBR</p>
        <div id="taskbarBtns">
          <button id="tbBt1" className={activePage === "pg1" ? "active" : ""} onClick={() => setActivePage("pg1")}>Main</button>
          <button id="tbBt2" className={activePage === "pg2" ? "active" : ""} onClick={() => setActivePage("pg2")}>Key Pair Gen</button>
          <button id="tbBt3" className={activePage === "pg3" ? "active" : ""} onClick={() => setActivePage("pg3")}>Page3</button>
        </div>
      </div>

      
      {activePage === "pg1" && (
        <div id="pg1Main">
          <h1>Page 1</h1>
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
