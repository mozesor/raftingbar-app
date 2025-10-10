/* Rafting Bar – Reports patch (drop-in, no markup changes required)
 * Hooks into your existing 'דוחות' page:
 * - Two mode buttons: "כניסה↔יציאה (זוגות)" => SUM_PAIRS, "מכניסה ראשונה עד יציאה אחרונה" => FIRST_LAST
 * - "הצג דוח" button triggers fetch+render
 * - Renders rows into the first visible report table that has the headers של תאריך/כניסה/יציאה/שעות/אירועים
 */
(function () {
  const cfg = (window.RB_CONFIG = Object.assign({}, window.RB_CONFIG || {}));
  if (!cfg.GAS_URL) {
    console.warn("[RB] Missing GAS_URL in rb-config.js");
    return;
  }
  const LS_KEY = cfg.modeKey || "rb_mode";
  const persist = !!cfg.persistPolicyToServer;

  // ---- State ----
  let currentMode = (cfg.forcePolicy && String(cfg.forcePolicy)) ||
                    localStorage.getItem(LS_KEY) ||
                    "FIRST_LAST";

  // ---- Helpers ----
  function text(el){ return (el && (el.textContent||"").trim()) || ""; }
  function matches(txt, re){ return re.test((txt||"").trim()); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function setMode(mode, {save=true, notify=true}={}){
    mode = String(mode||"").toUpperCase();
    if (mode!=="FIRST_LAST" && mode!=="SUM_PAIRS") return;
    if (cfg.forcePolicy) { mode = String(cfg.forcePolicy).toUpperCase(); }
    currentMode = mode;
    if (!cfg.forcePolicy && save) localStorage.setItem(LS_KEY, mode);
    markModeButtons(mode);
    if (persist && notify) {
      // fire-and-forget: /exec?fn=settings&policy=MODE
      fetch(cfg.GAS_URL + "?fn=settings&policy=" + encodeURIComponent(mode)).catch(()=>{});
    }
  }

  function markModeButtons(mode){
    // Give visual selection by toggling aria-pressed on the two known buttons (if exist)
    const allBtns = qsa("button, .chip, .toggle, .btn");
    allBtns.forEach(b=>{
      const t = text(b);
      const isPairs = /זוגות|pairs/i.test(t);
      const isFL = /ראשונה|אחרונה|first|last/i.test(t);
      if (isPairs || isFL){
        const mine = isPairs ? "SUM_PAIRS" : "FIRST_LAST";
        if (mine === mode) {
          b.setAttribute("aria-pressed","true");
          b.classList.add("rb-active-mode");
        } else {
          b.removeAttribute("aria-pressed");
          b.classList.remove("rb-active-mode");
        }
      }
    });
  }

  async function fetchReport(){
    const url = new URL(cfg.GAS_URL);
    url.searchParams.set("report","summary");
    // If forcePolicy is set – ask server with it. Else use currentMode
    const modeToAsk = (cfg.forcePolicy ? String(cfg.forcePolicy) : currentMode) || "FIRST_LAST";
    url.searchParams.set("mode", modeToAsk);
    // (Optional) you may add from/to/name here if you have them in the DOM.

    const res = await fetch(url.toString(), {cache:"no-store"});
    if (!res.ok) throw new Error("HTTP "+res.status);
    return await res.json();
  }

  function findReportTable(){
    // Pick the first table that contains the wanted header names
    const tables = qsa("table");
    for (const tbl of tables){
      const headTxt = text(tbl);
      if (/תאריך/.test(headTxt) && /כניסה/.test(headTxt) && /יציאה/.test(headTxt) && /שעות/.test(headTxt)){
        return tbl;
      }
    }
    return null;
  }

  function renderRows(data){
    const tbl = findReportTable();
    if (!tbl) {
      console.warn("[RB] Could not locate report table");
      return;
    }
    // Try to find tbody; otherwise build one
    let tbody = qs("tbody", tbl);
    if (!tbody){
      tbody = document.createElement("tbody");
      tbl.appendChild(tbody);
    }
    // remove all rows under tbody
    qsa("tr", tbody).forEach(tr=>tr.remove());

    const rows = (data && data.rows) || [];
    for (const r of rows){
      const tr = document.createElement("tr");
      const tdDate = document.createElement("td");
      const tdIn = document.createElement("td");
      const tdOut = document.createElement("td");
      const tdHours = document.createElement("td");
      const tdEvents = document.createElement("td");

      tdDate.textContent   = r.date || "";
      tdIn.textContent     = r.in   || "";
      tdOut.textContent    = r.out  || "";
      tdHours.textContent  = (r.hours!=null ? r.hours : "");
      tdEvents.textContent = (r.events!=null ? r.events : "");

      // Keep RTL alignment friendly
      [tdDate,tdIn,tdOut,tdHours,tdEvents].forEach(td=>td.style.whiteSpace="nowrap");

      tr.append(tdDate, tdIn, tdOut, tdHours, tdEvents);
      tbody.appendChild(tr);
    }
  }

  async function refreshReport(){
    try{
      markModeButtons(currentMode);
      const data = await fetchReport();
      if (!data || !data.ok){
        console.warn("[RB] summary error", data);
        return;
      }
      renderRows(data);
      console.log("[RB] summary:", data);
    }catch(err){
      console.error("[RB] summary fetch failed", err);
    }
  }

  // ---- Wire UI ----
  document.addEventListener("click", (ev)=>{
    const el = ev.target.closest("button, .chip, .toggle, .btn");
    if (!el) return;
    const t = text(el);

    // Mode toggles
    if (/זוגות|pairs/i.test(t)){
      ev.preventDefault();
      setMode("SUM_PAIRS");
      refreshReport();
      return;
    }
    if (/ראשונה|אחרונה|first|last/i.test(t)){
      ev.preventDefault();
      setMode("FIRST_LAST");
      refreshReport();
      return;
    }
    // Report trigger button
    if (/הצג דוח|Show Report/i.test(t)){
      ev.preventDefault();
      refreshReport();
      return;
    }
  }, true);

  // When the page first opens (דוחות tab), try to mark and fetch once
  setMode(currentMode, {save:false, notify:false});
  // try delayed first refresh (some pages render table a bit later)
  setTimeout(refreshReport, 400);
})();
