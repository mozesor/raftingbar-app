
/*! Rafting Bar — Apply FIRST_LAST to existing report table (drop-in)
 *  Build: 2025-10-11
 *  Usage: Add this line AFTER your existing scripts (near </body>):
 *     <script src="rb_firstlast_apply.js?v=2025-10-11"></script>
 *  This will hook into the "הצג דוח" button and rewrite the table cells.
 */
(function(){
  const GAS_URL = "https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec";

  function log(){ try{ console.log.apply(console, ["[FIRST_LAST]"].concat([].slice.call(arguments))); }catch(_){} }
  function warn(){ try{ console.warn.apply(console, ["[FIRST_LAST]"].concat([].slice.call(arguments))); }catch(_){} }

  function guessEmployee(){
    // Try selects that likely represent "בחר עובד"
    let sel = document.querySelector('select#employee, select[name*="employee" i], select[id*="employee" i], select[name*="עובד"], select[id*="עובד"]');
    if (sel) return (sel.value || (sel.selectedOptions && sel.selectedOptions[0] && sel.selectedOptions[0].textContent) || '').trim();
    // Try any select near text "בחר עובד" or "עובד"
    const selects = Array.from(document.querySelectorAll('select'));
    for (const s of selects){
      const box = s.closest('div') || s.parentElement;
      const txt = (box && box.textContent || '').trim();
      if (/בחר.?עובד|עובד:?/i.test(txt)) {
        return (s.value || (s.selectedOptions && s.selectedOptions[0] && s.selectedOptions[0].textContent) || '').trim();
      }
    }
    // Fallback: empty (all employees)
    return '';
  }

  function findReportTable(){
    const tables = Array.from(document.querySelectorAll('table'));
    for (const t of tables){
      const ths = Array.from(t.querySelectorAll('thead th'));
      if (!ths.length) continue;
      const labels = ths.map(th => (th.textContent||'').trim());
      const idxDate  = labels.findIndex(h => /תאריך/.test(h));
      const idxIn    = labels.findIndex(h => /כניסה/.test(h));
      const idxOut   = labels.findIndex(h => /יציאה/.test(h));
      const idxHours = labels.findIndex(h => /שעות/.test(h));
      if (idxDate>=0 && idxIn>=0 && idxOut>=0 && idxHours>=0){
        return { table:t, idxDate, idxIn, idxOut, idxHours };
      }
    }
    return null;
  }

  function guessYear(){
    const m = (document.body.innerText||'').match(/\b(20\d{2})\b/);
    return m ? m[1] : String(new Date().getFullYear());
  }

  function parseYmdFromCell(dateText){
    const s = (dateText||'').trim();
    // Case 1: DD/MM
    let m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (m){
      const d = ('0'+m[1]).slice(-2), mo=('0'+m[2]).slice(-2);
      return `${guessYear()}-${mo}-${d}`;
    }
    // Case 2: YYYY-MM-DD
    m = s.match(/^\d{4}-\d{2}-\d{2}$/);
    if (m) return s.slice(0,10);
    // Case 3: DD.MM or DD.MM.YYYY
    m = s.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
    if (m){
      const d=('0'+m[1]).slice(-2), mo=('0'+m[2]).slice(-2);
      const y=m[3] || guessYear();
      return `${y}-${mo}-${d}`;
    }
    return null;
  }

  function fmtHHMM(iso){
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2,'0');
    return pad(d.getHours())+':'+pad(d.getMinutes());
  }

  async function fetchMonthRows(month, employee){
    const u = new URL(GAS_URL);
    u.searchParams.set('report','summary');
    u.searchParams.set('mode','FIRST_LAST');
    u.searchParams.set('month', month);
    if (employee) u.searchParams.set('employee', employee);
    const res = await fetch(u.toString());
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    return (data && data.rows) || [];
  }

  async function apply(){
    const info = findReportTable();
    if (!info){ warn('לא נמצאה טבלת דוח מתאימה בדף'); return; }
    const {table, idxDate, idxIn, idxOut, idxHours} = info;

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    if (!rows.length){ warn('אין שורות בטבלה'); return; }

    // אסוף את כל התאריכים המוצגים כדי לגזור את החודש
    const ymds = [];
    for (const tr of rows){
      const dateText = (tr.children[idxDate] && tr.children[idxDate].textContent || '').trim();
      const ymd = parseYmdFromCell(dateText);
      if (ymd) ymds.push(ymd);
    }
    if (!ymds.length){ warn('לא הצלחתי לפרש תאריכים מהטבלה'); return; }

    const month = ymds[0].slice(0,7);
    const employee = guessEmployee();
    log('month:', month, 'employee:', employee||'(all)');

    // שלוף דוח מהשרת
    let serverRows = [];
    try{
      serverRows = await fetchMonthRows(month, employee);
    }catch(err){
      warn('שגיאה בשליפת דוח מהשרת:', err);
      return;
    }

    // מיפוי לפי תאריך
    const byDate = Object.create(null);
    for (const r of serverRows){ byDate[r.date] = r; }

    // כתיבה חזרה לטבלה
    let sumHours = 0;
    for (const tr of rows){
      const dateText = (tr.children[idxDate] && tr.children[idxDate].textContent || '').trim();
      const ymd = parseYmdFromCell(dateText);
      if (!ymd) continue;
      const r = byDate[ymd];
      if (!r) continue;

      const fi = r.intervals && r.intervals[0] && r.intervals[0].in  || '';
      const lo = r.intervals && r.intervals[0] && r.intervals[0].out || '';
      const h  = (r.totalMs||0)/3600000;

      if (fi) tr.children[idxIn].textContent  = fmtHHMM(fi);
      if (lo) tr.children[idxOut].textContent = fmtHHMM(lo);
      tr.children[idxHours].textContent = h.toFixed(2);
      sumHours += h;
    }

    // עדכון "סה״כ שעות" אם יש טקסט כזה ליד הטבלה
    const totalsContainers = Array.from(document.querySelectorAll('*')).filter(el => /סה.?כ שעות/.test(el.textContent||''));
    if (totalsContainers.length){
      const el = totalsContainers[0];
      // החלפת המספר האחרון בטקסט בסכום חדש
      el.innerHTML = el.innerHTML.replace(/(\d+(?:\.\d+)?)(?!.*\d)/, sumHours.toFixed(2));
    }

    log('הוחל FIRST_LAST על הטבלה בהצלחה');
  }

  // הפעלה ראשונית + אחרי לחיצה על "הצג דוח"
  setTimeout(apply, 800);
  document.addEventListener('click', (e)=>{
    const t = (e.target && e.target.textContent || '').trim();
    if (t === 'הצג דוח') setTimeout(apply, 800);
  });
})();
