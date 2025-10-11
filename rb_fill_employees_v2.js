
/*! Auto-fill employee select (robust) from Apps Script
 *  v2025-10-11b
 *  Include BEFORE rb_firstlast_apply.js
 *    <script src="rb_fill_employees_v2.js?v=2025-10-11b"></script>
 */
(function(){
  const GAS_URL = "https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec";

  // --- DOM helpers ---
  function findEmployeeSelect(){
    // 1) explicit ids/names/aria
    let sel = document.querySelector('select[aria-label="בחר עובד"], select#employee, select[name*="employee" i], select[id*="employee" i]');
    if (sel) return sel;
    // 2) Hebrew hints: any select inside a block that mentions "בחר עובד"
    const selects = Array.from(document.querySelectorAll('select'));
    for (const s of selects){
      const box = s.closest('section, div, form, .card, .container') || s.parentElement;
      const txt = (box && box.textContent || '').replace(/\s+/g,' ').trim();
      if (/בחר.?עובד|עובד:?/i.test(txt)) return s;
    }
    // 3) fallback: the first select on page
    return selects[0] || null;
  }

  function monthStr(d){ return d.toISOString().slice(0,7); }

  async function fetchMonth(month){
    const u = new URL(GAS_URL);
    u.searchParams.set('report','summary');
    u.searchParams.set('mode','FIRST_LAST');
    u.searchParams.set('month', month);
    const res = await fetch(u.toString());
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    return (data && data.rows) || [];
  }

  async function fetchNamesSmart(){
    // Try current month; if empty, backtrack up to 6 months
    const names = new Set();
    const now = new Date();
    for (let i=0; i<6; i++){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const rows = await fetchMonth(monthStr(d));
      for (const r of rows){ if (r && r.employee) names.add(r.employee); }
      if (names.size) break;
    }
    return Array.from(names).sort((a,b)=> a.localeCompare(b,'he'));
  }

  async function fill(){
    const sel = findEmployeeSelect();
    if (!sel) return;

    // Only fill when the list is empty (no meaningful options)
    const hasMeaningful = Array.from(sel.options).some(o => (o.textContent||'').trim());
    if (hasMeaningful) return;

    try{
      const names = await fetchNamesSmart();
      if (!names.length) return;
      const opts = ['<option value="">בחר עובד/ת…</option>'].concat(names.map(n=>`<option value="${n}">${n}</option>`)).join('');
      sel.innerHTML = opts;
      // Trigger change once so that other code reacts
      const evt = new Event('change', {bubbles:true});
      sel.dispatchEvent(evt);
    }catch(e){
      console.warn('[rb_fill_employees_v2] failed:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fill);
  } else {
    setTimeout(fill, 0);
  }
})();
