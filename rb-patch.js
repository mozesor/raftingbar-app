/** RB PATCH: calc-mode switch + force `calc` for summary + safe refresh **/
(function () {
  var KEY = 'rb_calc_mode'; // ערכים: 'FIRST_LAST' או 'SUM_PAIRS'

  function getMode() {
    try { var m = localStorage.getItem(KEY); return (m === 'SUM_PAIRS') ? 'SUM_PAIRS' : 'FIRST_LAST'; }
    catch (e) { return 'FIRST_LAST'; }
  }
  function setMode(m) {
    try { localStorage.setItem(KEY, m); } catch (e) {}
    paintButtons();
    refreshReport();
  }

  // --- יצירת מתג (שני כפתורים) והדבקה לפני "הצג דוח" ---
  function ensureSwitcher() {
    if (document.getElementById('rb-calc-switcher')) return;

    const host = document.createElement('div');
    host.id = 'rb-calc-switcher';
    host.className = 'rb-calc-switcher';
    host.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0">
        <span style="opacity:.8">מצב חישוב:</span>
        <button type="button" class="rbbtn" id="calcFirstLastBtn">מכניסה ראשונה עד יציאה אחרונה</button>
        <button type="button" class="rbbtn" id="calcPairsBtn">(זוגות) כניסות↔יציאות</button>
        <span data-rb-mode-indicator style="opacity:.6"></span>
      </div>
    `;

    // ננסה לשתול ממש לפני הכפתור "הצג דוח"
    let anchor = [...document.querySelectorAll('button,.btn,[role="button"],[onclick]')]
      .find(b => /הצג\s*דוח|הצגה|חשב|הצג/i.test((b.textContent || '') + (b.getAttribute('aria-label') || '')));
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(host, anchor);
    else document.body.insertBefore(host, document.body.firstChild);

    wireButtons();
    paintButtons();
  }

  // --- חיבור הכפתורים ---
  function wireButtons() {
    const fl = document.getElementById('calcFirstLastBtn');
    const pr = document.getElementById('calcPairsBtn');
    if (fl && !fl.__wired) {
      fl.__wired = true;
      fl.addEventListener('click', () => setMode('FIRST_LAST'));
    }
    if (pr && !pr.__wired) {
      pr.__wired = true;
      pr.addEventListener('click', () => setMode('SUM_PAIRS'));
    }
  }

  // --- צביעה: כפתור פעיל + טקסט מצב לידם ---
  function paintButtons() {
    const m = getMode();
    const fl = document.getElementById('calcFirstLastBtn');
    const pr = document.getElementById('calcPairsBtn');
    const ind = document.querySelector('[data-rb-mode-indicator]');
    if (fl) { fl.classList.toggle('active', m === 'FIRST_LAST'); fl.setAttribute('aria-pressed', m === 'FIRST_LAST'); }
    if (pr) { pr.classList.toggle('active', m === 'SUM_PAIRS');  pr.setAttribute('aria-pressed', m === 'SUM_PAIRS'); }
    if (ind) ind.textContent = (m === 'FIRST_LAST' ? 'מכניסה ראשונה עד יציאה אחרונה' : '(זוגות) כניסות↔יציאות');
  }

  // --- מוסיף calc=... לכל בקשה שמייצרת דוח (?report=summary) – עובד גם עם fetch וגם XHR ---
  (function patchNetwork() {
    const _fetch = window.fetch;
    if (typeof _fetch === 'function') {
      window.fetch = function (input, init) {
        try {
          const url = (typeof input === 'string')
            ? new URL(input, location.href)
            : (input && input.url) ? new URL(input.url, location.href) : null;
          if (url && url.searchParams.get('report') === 'summary') {
            url.searchParams.set('calc', getMode()); // FIRST_LAST / SUM_PAIRS
            if (typeof input === 'string') input = url.toString();
            else if (input && input.url) input = new Request(url.toString(), input);
          }
        } catch (e) {}
        return _fetch.apply(this, arguments);
      };
    }
    const _open = XMLHttpRequest && XMLHttpRequest.prototype && XMLHttpRequest.prototype.open;
    if (_open) {
      XMLHttpRequest.prototype.open = function (method, url) {
        try {
          const u = new URL(url, location.href);
          if (u.searchParams.get('report') === 'summary') {
            u.searchParams.set('calc', getMode());
            arguments[1] = u.toString();
          }
        } catch (e) {}
        return _open.apply(this, arguments);
      };
    }
  })();

  // --- רענון הדוח אחרי החלפת מצב (ללא תלות בשם הפונקציה שלך) ---
  function refreshReport() {
    const runBtn =
      document.getElementById('btn-run') ||
      document.getElementById('run') ||
      [...document.querySelectorAll('button')].find(b => /הצג\s*דוח|הצגה|חשב/i.test(b.textContent || ''));
    if (runBtn) { try { runBtn.click(); return; } catch (e) {} }

    const fns = [window.runReport, window.updateReports, window.updateReportsPage, window.refreshReports, window.renderDetailedReport];
    for (let i = 0; i < fns.length; i++) if (typeof fns[i] === 'function') { try { fns[i](); return; } catch (e) {} }
  }

  // --- אתחול ---
  document.addEventListener('DOMContentLoaded', () => {
    ensureSwitcher();
    // אם עוברים ללשונית "דוחות" בדפדוף – נוודא שהסוויצ'ר נוצר
    document.querySelector('#navReports,[data-page="reports"]')
      ?.addEventListener('click', () => setTimeout(ensureSwitcher, 50));
  });
})();
