/* Rafting Bar - Patch: wire chips + force mode into exec calls + mode badge */
(function () {
  var STORE_KEY = 'rb_calc_mode';

  // --- מצב חישוב (pairs / span) ---
  try {
    window.REPORT_HOURS_MODE = localStorage.getItem(STORE_KEY) || window.REPORT_HOURS_MODE || 'pairs';
  } catch (e) {
    window.REPORT_HOURS_MODE = window.REPORT_HOURS_MODE || 'pairs';
  }

  // --- הוספת mode לכל קריאת fetch שמכוונת ל-Apps Script /exec ---
  (function patchFetch() {
    if (window.__rbFetchPatched) return;
    window.__rbFetchPatched = true;

    var origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        var req = (typeof input === 'string') ? new Request(input, init) : input;
        var url = new URL(req.url, location.href);

        // מוסיפים mode רק לקריאות ל-Google Script (script.google.com / script.googleusercontent.com)
        var isExec = /script\.google(?:usercontent)?\.com$/i.test(url.hostname);
        if (isExec) {
          // אם אין mode, נוסיף אותו (pairs/span)
          if (!url.searchParams.get('mode')) {
            url.searchParams.set('mode', window.REPORT_HOURS_MODE || 'pairs');
          }
          // בונים בקשה חדשה עם ה-URL המעודכן
          req = new Request(url.toString(), req);
        }
        return origFetch.call(this, req);
      } catch (err) {
        return origFetch.call(this, input, init);
      }
    };
  })();

  // --- תווית מצב ליד הצ’יפים + צביעה ---
  function ensureModeBadge() {
    var scope = document.getElementById('detailedReportsContent') || document;
    // מחפש את ה-wrapper של הכפתורים/פילטרים
    var chipsRow = scope.querySelector('.chips, .toolbar, .filters, .flex, .row') || scope.querySelector('[data-chips]') || scope;
    var badge = document.getElementById('rbModeBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'rbModeBadge';
      badge.style.cssText = 'margin-inline-start:8px;padding:4px 8px;border-radius:999px;border:1px solid #d0d5dd;background:#f6f7fb;font-size:12px;color:#333;';
      chipsRow.appendChild(badge);
    }
    badge.textContent =
      (window.REPORT_HOURS_MODE === 'pairs')
        ? 'מצב: כניסות↔יציאות (זוגות)'
        : 'מצב: כניסה ראשונה → יציאה אחרונה';
  }

  function findChipByText(txt) {
    var scope = document.getElementById('detailedReportsContent') || document;
    var els = scope.querySelectorAll('button, .chip, .toggle, .btn');
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (t.indexOf(txt) !== -1) return els[i];
    }
    return null;
  }

  function paintChips() {
    var chipPairs = findChipByText('כניסות↔יציאות'); // "(זוגות) כניסות↔יציאות"
    var chipSpan  = findChipByText('כניסה ראשונה');  // "כניסה ראשונה עד יציאה אחרונה"
    if (chipPairs) chipPairs.classList.toggle('active', window.REPORT_HOURS_MODE === 'pairs');
    if (chipSpan)  chipSpan.classList.toggle('active',  window.REPORT_HOURS_MODE === 'span');
    ensureModeBadge();
  }

  function triggerRun() {
    // לוחץ על "הצג דוח" הקיים שלך כדי לטעון שוב את הטבלה
    var scope = document.getElementById('detailedReportsContent') || document;
    var runBtn = Array.from(scope.querySelectorAll('button, .btn'))
      .find(function (b) { return /הצג דוח/.test(b.textContent || ''); });
    if (runBtn) runBtn.click();
  }

  function setMode(mode) {
    window.REPORT_HOURS_MODE = mode;               // ← כאן המנוע שלך משתמש (pairs/span)
    try { localStorage.setItem(STORE_KEY, mode); } catch (e) {}
    paintChips();
    // מרענן את המסכים/טבלאות (פונקציות קיימות אצלך—נרוץ אם קיימות)
    try { if (typeof updateDetailedReports === 'function') updateDetailedReports(); } catch (e) {}
    try { if (typeof renderSelf === 'function') renderSelf(); } catch (e) {}
    try { if (typeof updateAll === 'function') updateAll(); } catch (e) {}
    // למקרה שהרענון הוא דרך כפתור
    triggerRun();
  }

  // --- חיבור לצ’יפים ---
  var chipPairs = findChipByText('כניסות↔יציאות');
  var chipSpan  = findChipByText('כניסה ראשונה');
  if (chipPairs) chipPairs.addEventListener('click', function () { setMode('pairs'); }, { passive: true });
  if (chipSpan)  chipSpan.addEventListener('click',  function () { setMode('span');  }, { passive: true });

  // --- השאר טבלה אחת בלבד (אם נשאר ווידג׳ט נוסף) ---
  var rbw = document.getElementById('rbReportWidget'); if (rbw) rbw.style.display = 'none';
  var rbt = document.getElementById('rbTable');        if (rbt && rbt.closest('div')) rbt.closest('div').style.display = 'none';

  // צביעה ותווית מצב בהפעלה
  paintChips();

  // אם זה SPA – לצבוע מחדש כשנכנסים לעמוד הדוחות
  var _showPage = window.showPage;
  window.showPage = function (p) {
    if (_showPage) _showPage(p);
    if (p === 'detailedReports') setTimeout(paintChips, 60);
  };
})();
