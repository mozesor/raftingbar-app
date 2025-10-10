console.log('[RB Patch] Loaded ✅');

const FIRST = 'FIRST_LAST';
const PAIRS = 'SUM_PAIRS';
const STORAGE_KEY = 'RB_CALC_MODE';

/** שמירת מצב בחישוב */
function setMode(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
  console.log('[RB] Mode saved:', mode);
}

/** טעינת מצב נוכחי */
function getMode() {
  return localStorage.getItem(STORAGE_KEY) || FIRST;
}

/** צביעת כפתור נבחר */
function paintMode(mode) {
  const btnPairs = findButton(/כניס.*יציא.*זוג/);
  const btnFirst = findButton(/מכניס.*ראשונ.*עד.*אחרונ/);
  if (btnPairs) btnPairs.classList.toggle('active', mode === PAIRS);
  if (btnFirst) btnFirst.classList.toggle('active', mode === FIRST);
}

/** חיפוש אלמנט לפי טקסט (regex) */
function findButton(regex) {
  return Array.from(document.querySelectorAll('button, .chip, .btn, span, div'))
    .find(el => regex.test((el.textContent || '').replace(/\s+/g, '')));
}

/** חיבור אירועים לכפתורים */
function wireButtons() {
  const btnPairs = findButton(/כניס.*יציא.*זוג/);
  const btnFirst = findButton(/מכניס.*ראשונ.*עד.*אחרונ/);

  if (btnPairs) btnPairs.onclick = () => {
    setMode(PAIRS);
    pushSettingToScript(PAIRS);
    paintMode(PAIRS);
    refreshReport();
  };
  if (btnFirst) btnFirst.onclick = () => {
    setMode(FIRST);
    pushSettingToScript(FIRST);
    paintMode(FIRST);
    refreshReport();
  };
}

/** שליחת עדכון ל־Google Apps Script */
function pushSettingToScript(policy) {
  const url = `https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec?fn=settings&policy=${policy}`;
  fetch(url)
    .then(r => r.json())
    .then(j => console.log('[RB] settings ->', j))
    .catch(e => console.warn('[RB] settings error', e));
}

/** רענון דו"ח */
function refreshReport() {
  console.log('[RB] refreshing report...');
  const btn = document.querySelector('button, .btn, .chip');
  if (btn) btn.click();
}

/** שינוי fetch כדי להוסיף mode */
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const [url, opts] = args;
  if (typeof url === 'string' && url.includes('report=summary')) {
    const mode = getMode();
    const newUrl = url.includes('mode=') ? url : `${url}&mode=${mode}`;
    console.log('[RB patch] Injected mode=', mode);
    return originalFetch.call(this, newUrl, opts);
  }
  return originalFetch.apply(this, args);
};

/** צפייה בשינויים בדף (לכפתורים דינמיים) */
const observer = new MutationObserver(() => wireButtons());
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('load', () => {
  wireButtons();
  paintMode(getMode());
  console.log('[RB patch] Ready!');
});
