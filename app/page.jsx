"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/form/app.js";
    script.dataset.formApp = "true";
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#today" aria-label="FORM home">
            <span className="brand-mark">f.</span>
            <span>FORM</span>
          </a>
          <div className="topbar-actions">
            <span className="save-state" id="saveState" aria-live="polite">On this device</span>
            <button className="icon-button" type="button" data-nav="settings" aria-label="Settings">•••</button>
          </div>
        </header>
        <main id="main" className="main-content" tabIndex={-1} />
        <nav className="bottom-nav" id="bottomNav" aria-label="Main navigation">
          <button type="button" data-nav="today" className="nav-item active"><span className="nav-icon">⌂</span><span>Today</span></button>
          <button type="button" data-nav="plan" className="nav-item"><span className="nav-icon">▦</span><span>Plan</span></button>
          <button type="button" data-nav="history" className="nav-item"><span className="nav-icon">⌁</span><span>History</span></button>
          <button type="button" data-nav="settings" className="nav-item"><span className="nav-icon">•••</span><span>Settings</span></button>
        </nav>
      </div>

      <dialog id="editorDialog" className="dialog">
        <form id="workoutEditorForm" method="dialog">
          <div className="dialog-head"><div><p className="eyebrow">Program editor</p><h2 id="editorTitle">Edit workout</h2></div><button className="icon-button" value="cancel" formNoValidate aria-label="Close">×</button></div>
          <div id="editorFields" />
          <div className="dialog-actions"><button className="button button-quiet" value="cancel" formNoValidate>Cancel</button><button className="button button-primary" id="saveWorkoutButton" value="save">Save workout</button></div>
        </form>
      </dialog>

      <dialog id="importDialog" className="dialog">
        <form id="importForm" method="dialog">
          <div className="dialog-head"><div><p className="eyebrow">Move your training data</p><h2>Import CSV</h2></div><button className="icon-button" value="cancel" formNoValidate aria-label="Close">×</button></div>
          <label className="field-label" htmlFor="importType">What are you importing?</label>
          <select id="importType" className="field"><option value="routine">Program / routine</option><option value="history">Workout history</option></select>
          <label className="field-label" htmlFor="csvFile">Choose a CSV file</label>
          <input className="field file-field" id="csvFile" type="file" accept=".csv,text/csv" required />
          <p className="help-copy" id="csvHelp">Routine columns: workout, day, exercise, sets, min_reps, max_reps, rir, load</p>
          <button className="text-button" type="button" id="downloadTemplate">Download sample CSV</button>
          <div className="dialog-actions"><button className="button button-quiet" value="cancel" formNoValidate>Cancel</button><button className="button button-primary" id="importCsvButton" value="import">Import</button></div>
        </form>
      </dialog>

      <dialog id="confirmDialog" className="dialog">
        <form method="dialog"><div id="confirmContent" /><div className="dialog-actions"><button className="button button-quiet" value="cancel">Cancel</button><button className="button button-primary" id="confirmAction" value="confirm">Continue</button></div></form>
      </dialog>

      <dialog id="syncChoiceDialog" className="dialog">
        <form method="dialog"><div className="dialog-head"><div><p className="eyebrow">Choose what to keep</p><h2>Two sets of training data</h2></div></div><p className="subtitle">We’ll combine completed workout histories either way. Choose which plan to use. Any workout in progress on this device will be kept.</p><div className="dialog-actions sync-choice-actions"><button className="button button-primary" value="local">Use this device’s plan</button><button className="button button-quiet" value="cloud">Use the account’s plan</button><button className="button button-quiet" value="cancel">Cancel</button></div></form>
      </dialog>

      <div className="toast" id="toast" role="status" aria-live="polite" />
    </>
  );
}
