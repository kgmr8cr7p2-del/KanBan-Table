import { createRoot } from "react-dom/client";
import { BoardClient } from "../../src/components/BoardClient";
import { AppNav } from "../../src/components/AppNav";
import fixture from "./fixture.json";

const view = fixture as any;
createRoot(document.getElementById("root")!).render(
  <div className="app">
    <aside className="sidebar">
      <div className="brand"><img src="/taskora-icon-v2.png" width="28" height="28" alt="" /><span>Taskora</span></div>
      <AppNav user={view.currentUser} />
    </aside>
    <main className="main"><BoardClient initialView={view} /></main>
  </div>,
);
