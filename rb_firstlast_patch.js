
/*! Rafting Bar — FIRST_LAST Reports Modal (drop-in)
 *  Build: 2025-10-11
 *  Usage: Add this line before </body> in your existing index.html:
 *    <script src="rb_firstlast_patch.js?v=2025-10-11"></script>
 */
(function(){
  const GAS_URL = "https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec";
  const S = { mode:'FIRST_LAST', month:new Date().toISOString().slice(0,7), employee:'' };

  const css = `
  .rbfl-btn{position:fixed;inset-inline-start:16px;inset-block-end:16px;z-index:9999;
    background:#0b1220;color:#e5e7eb;border:1px solid #334155;border-radius:999px;
    padding:10px 14px;font:600 14px/1.2 Heebo,system-ui;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.25)}
  .rbfl-modal{position:fixed;inset:0;z-index:9998;background:rgba(2,6,23,.6);backdrop-filter:blur(3px);display:none}
  .rbfl-panel{position:absolute;inset-block-start:40px;inset-inline:max(10px, 50% - 560px);
    width:min(1100px, 96%);background:#111827;border:1px solid #1f2937;border-radius:16px;color:#e5e7eb;
    font-family:Heebo,system-ui;box-shadow:0 10px 35px rgba(0,0,0,.4)}
  .rbfl-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #1f2937;background:#0b1220}
  .rbfl-title{margin:0;font-size:16px}
  .rbfl-close{background:transparent;border:0;color:#93c5fd;font:600 16px/1 Heebo,cursive;cursor:pointer}
  .rbfl-body{padding:14px}
  .rbfl-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-block-end:10px}
  .rbfl-card{background:#0b1220;border:1px solid #1f2937;border-radius:12px;padding:12px}
  .rbfl-label{font-size:12px;color:#9ca3af;display:block;margin-block-end:6px}
  .rbfl-input,.rbfl-btn2{height:36px;border-radius:10px;border:1px solid #334155;background:#0b1220;color:#e5e7eb;padding:0 10px}
  .rbfl-btn2{cursor:pointer}
  .rbfl-btn2.primary{outline:2px solid #60a5fa}
  table.rbfl{width:100%;border-collapse:collapse}
  .rbfl th,.rbfl td{padding:10px;border-bottom:1px dashed #273244;text-align:center;font-size:14px}
  .rbfl th{color:#9ca3af}
  .rbfl-mono{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}
  .rbfl-footer{display:flex;justify-content:space-between;align-items:center;color:#9ca3af;font-size:13px;margin-block:6px 10px}
  `;

  function inject(){
    // style
    const st = document.createElement('style');
    st.id = "rbfl-style";
    st.textContent = css;
    document.head.appendChild(st);

    // floating button
    const btn = document.createElement('button');
    btn.className = "rbfl-btn";
    btn.textContent = "דוחות (FIRST/LAST)";
    btn.title = "לחץ לפתיחת דוחות";
    document.body.appendChild(btn);

    // modal
    const modal = document.createElement('div');
    modal.className = "rbfl-modal";
    modal.innerHTML = `
      <div class="rbfl-panel" role="dialog" aria-label="דוחות נוכחות">
        <div class="rbfl-head">
          <h3 class="rbfl-title">📊 דוחות נוכחות — כניסה ראשונה → יציאה אחרונה / סיכום זוגות</h3>
          <button class="rbfl-close" aria-label="סגור">✕</button>
        </div>
        <div class="rbfl-body">
          <div class="rbfl-row">
            <label class="rbfl-card">
              <span class="rbfl-label">עובד/ת</span>
              <input class="rbfl-input" id="rbfl-employee" placeholder="(ריק = כולם)" />
            </label>
            <label class="rbfl-card">
              <span class="rbfl-label">חודש</span>
              <input class="rbfl-input" id="rbfl-month" type="month" />
            </label>
            <div class="rbfl-card">
              <span class="rbfl-label">מצב חישוב</span>
              <div class="rbfl-row">
                <button class="rbfl-btn2" id="rbfl-first">כניסה ראשונה → יציאה אחרונה</button>
                <button class="rbfl-btn2" id="rbfl-pairs">סיכום כל הזוגות</button>
              </div>
            </div>
            <div style="flex:1"></div>
            <div><button class="rbfl-btn2 primary" id="rbfl-refresh">הצג דוח</button></div>
          </div>

          <div class="rbfl-card">
            <div class="rbfl-footer">
              <div>ימי עבודה: <span id="rbfl-days" class="rbfl-mono">—</span></div>
              <div>סה״כ שעות: <span id="rbfl-hours" class="rbfl-mono">—</span></div>
              <div>סה״כ אירועים: <span id="rbfl-events" class="rbfl-mono">—</span></div>
            </div>
            <div style="overflow:auto">
              <table class="rbfl" id="rbfl-tbl">
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>כניסה</th>
                    <th>יציאה</th>
                    <th>שעות</th>
                    <th>אירועים</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // events
    const $ = s=>modal.querySelector(s);
    const pad = n=>String(n).padStart(2,'0');
    const hhmm = iso=>{
      if(!iso) return '—';
      const d=new Date(iso);
      return pad(d.getHours())+':'+pad(d.getMinutes());
    };
    const setMode=(m)=>{
      S.mode=m;
      $("#rbfl-first").classList.toggle('primary', m==='FIRST_LAST');
      $("#rbfl-pairs").classList.toggle('primary', m==='SUM_PAIRS');
    };
    const rowsToTable=(rows)=>{
      const tb=$("#rbfl-tbl tbody"); tb.innerHTML='';
      let days=0, events=0, hours=0;
      rows.sort((a,b)=> a.date.localeCompare(b.date));
      for(const r of rows){
        const h=(r.totalMs||0)/3600000;
        if(h>0){days++; hours+=h;}
        const firstIn = r.intervals?.[0]?.in  || '';
        const lastOut = r.intervals?.[0]?.out || '';
        const tr=document.createElement('tr');
        tr.innerHTML = `<td class="rbfl-mono">${r.date}</td>
                        <td class="rbfl-mono">${S.mode==='FIRST_LAST'?hhmm(firstIn):'—'}</td>
                        <td class="rbfl-mono">${S.mode==='FIRST_LAST'?hhmm(lastOut):'—'}</td>
                        <td class="rbfl-mono">${h.toFixed(2)}</td>
                        <td class="rbfl-mono">${r.intervals?.length ?? 0}</td>`;
        tb.appendChild(tr);
        events += r.intervals?.length ?? 0;
      }
      $("#rbfl-days").textContent=days;
      $("#rbfl-hours").textContent=hours.toFixed(2);
      $("#rbfl-events").textContent=events;
    };
    const fetchReport=async()=>{
      const u=new URL(GAS_URL);
      u.searchParams.set('report','summary');
      u.searchParams.set('mode', S.mode);
      u.searchParams.set('month', S.month);
      if(S.employee) u.searchParams.set('employee', S.employee);
      const res = await fetch(u.toString());
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      return data.rows || [];
    };

    // wire
    $("#rbfl-month").value=S.month;
    $("#rbfl-employee").value=S.employee;
    setMode(S.mode);

    $("#rbfl-first").onclick = ()=>{ setMode('FIRST_LAST'); fetchReport().then(rowsToTable).catch(console.error); };
    $("#rbfl-pairs").onclick = ()=>{ setMode('SUM_PAIRS');  fetchReport().then(rowsToTable).catch(console.error); };
    $("#rbfl-month").onchange = e=> S.month = e.target.value || S.month;
    $("#rbfl-employee").onchange = e=> S.employee = (e.target.value||'').trim();
    $("#rbfl-refresh").onclick = ()=> fetchReport().then(rowsToTable).catch(err=> alert('שגיאה: '+err.message));

    // open/close
    btn.onclick = ()=>{ modal.style.display='block'; fetchReport().then(rowsToTable).catch(console.error); };
    modal.querySelector('.rbfl-close').onclick = ()=>{ modal.style.display='none'; };
    modal.addEventListener('click', (ev)=>{ if(ev.target===modal){ modal.style.display='none'; } });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
