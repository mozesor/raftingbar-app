/* rb-patch.js — wire mode buttons + force ?mode=... on summary requests  */

(function () {
  // ****** 1) הגדרות ******
  // כתובת ה-WebApp שלך (Exec) — זו שמופיעה בחלון "ניהול הפריסות"
  const EXEC = 'https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec';

  // מפתח לשמירת המצב בדפדפן
  const LS_KEY = 'rb_mode';
  const FIRST = 'FIRST_LAST';
  const PAIRS = 'SUM_PAIRS';

  // mode ברירת־מחדל
  function getMode() {
    return (localStorage.getItem(LS_KEY) || FIRST);
  }
  function setMode(m) {
    localStorage.setItem(LS_KEY, m);
    paintMode(m);
  }

  // ****** 2) צביעה ויזואלית לכפתורים ******
  function paintMode(m) {
    // מוצא לפי הטקסטים הקיימים אצלך בדף
    const btnPairs = findByText(['כניסות↔יציאות (זוגות)', 'כניסות-יציאות (זוגות)']);
    const btnFirst = findByText(['מכניסה ראשונה עד יציאה אחרונה']);

    [btnPairs, btnFirst].forEach(b => b && b.classList.remove('active','bg-blue-600'));
    if (m === PAIRS && btnPairs) btnPairs.classList.add('active','bg-blue-600');
    if (m === FIRST && btnFirst) btnFirst.classList.add('active','bg-blue-600');
  }

function findByText(texts) {
  const candidates = Array.from(document.querySelectorAll('button, .chip, .toggle, .btn, span, div'));
  for (const t of texts) {
    const el = candidates.find(e => {
      const txt = (e.textContent || e.innerText || '').replace(/\s+/g, ' ').trim();
      return txt.includes(t);
    });
    if (el) return el;
  }
  return null;
}


  // ****** 3) מאזינים לכפתורי המצבים ******
  function wireButtons() {
    const btnPairs = findByText(['כניסות↔יציאות (זוגות)', 'כניסות-יציאות (זוגות)']);
    const btnFirst = findByText(['מכניסה ראשונה עד יציאה אחרונה']);

    if (btnPairs) btnPairs.addEventListener('click', () => {
      setMode(PAIRS);
      pushSettingToScript(PAIRS);   // אופציונלי – מעדכן גם ב־Apps Script
      refreshReport();
    });

    if (btnFirst) btnFirst.addEventListener('click', () => {
      setMode(FIRST);
      pushSettingToScript(FIRST);   // אופציונלי – מעדכן גם ב־Apps Script
      refreshReport();
    });

    // צביעה ראשונית
    paintMode(getMode());
  }

  // ****** 4) שולח עדכון מצב אל Apps Script (אפשר להשאיר, גם אם לא חובה להצגה) ******
  function pushSettingToScript(policy) {
    const u = new URL(EXEC);
    u.searchParams.set('fn', 'settings');
    u.searchParams.set('policy', policy);
    u.searchParams.set('ts', Date.now());
    // לא חוסם את ה-UI; תוצאה רק לקונסול
    fetch(u.toString()).then(r => r.json()).then(j => {
      console.log('[RB] settings ->', j);
    }).catch(err => console.warn('[RB] settings failed', err));
  }

  // ****** 5) מרענן דו"ח: אם יש כפתור "הצג דוח" – נלחץ עליו; אחרת לא צריך (כי הפאטץ’ על fetch ידאג) ******
  function refreshReport() {
    const btnShow = Array.from(document.querySelectorAll('button, .btn'))
      .find(b => (b.textContent || '').trim().includes('הצג דוח'));
    if (btnShow) btnShow.click();
  }

  // ****** 6) עיטוף fetch — מוסיף &mode=<selected> לכל summary ******
  const _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      let url = typeof input === 'string' ? input : input && input.url ? input.url : '';

      // נאתר קריאות לדו"ח
      if (url.includes('/exec') && url.includes('report=summary')) {
        const u = new URL(url, location.origin);
        // הוסף/עדכן mode לפי הבחירה
        u.searchParams.set('mode', getMode());
        // Cache buster
        u.searchParams.set('ts', Date.now());
        url = u.toString();
        input = (typeof input === 'string') ? url : new Request(url, input);
      }
    } catch (e) {
      console.warn('[RB] fetch patch skipped', e);
    }
    return _fetch(input, init);
  };

  // ****** 7) init אחרי שהדף מוכן ******
  document.addEventListener('DOMContentLoaded', wireButtons);
  // לעתים הדף כבר “מוכן”
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    wireButtons();
  }
})();
