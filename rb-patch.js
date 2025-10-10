/*
 * RB PATCH – policy switcher + report refresh
 */
(function(){

  const GAS_URL = "https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec";

  function getSelectedName(){
    const sel = document.querySelector('select, [data-employee-select]');
    if (sel && sel.value) return sel.value.trim();
    return '';
  }

  async function setPolicy(policy){  // 'SUM_PAIRS' | 'FIRST_LAST'
    const params = new URLSearchParams();
    params.set('fn', 'settings');
    params.set('policy', policy);
    const name = getSelectedName();
    if (name) params.set('name', name);

    const url = GAS_URL + '?' + params.toString() + '&_ts=' + Date.now();
    console.log('⚙️ Settings update →', url);
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    let txt = await res.text();
    try { return JSON.parse(txt); } catch(_) { return { ok:false, raw: txt }; }
  }

  function runReport(){
    const scope = document.getElementById('detailedReportsContent') || document;
    const btn = Array.from(scope.querySelectorAll('button, .btn'))
      .find(b => /הצג\s*דוח|הצג\s*דו"?ח/i.test((b.textContent||'')));
    if (btn) { btn.click(); return; }
    try { if (typeof updateDetailedReports==='function') return updateDetailedReports(); } catch(e){}
    try { if (typeof updateReports==='function')          return updateReports(); } catch(e){}
  }

  async function onMode(mode){
    const policy = mode==='pairs' ? 'SUM_PAIRS' : 'FIRST_LAST';
    try {
      const r = await setPolicy(policy);
      console.log('⬅️ Settings response', r);
    } catch(e) {
      console.warn('Settings error', e);
    } finally {
      runReport();
    }
  }

  document.addEventListener('click', function(ev){
    const el = ev.target.closest('button, .chip, .toggle, .btn');
    if (!el) return;
    const t = (el.textContent||'').trim();
    if (/כניסות.?↔.?יציאות|זוגות/.test(t))      onMode('pairs');
    else if (/כניסה\s*ראשונה|ראשונה עד יציאה אחרונה/.test(t)) onMode('span');
  }, true);

})();
