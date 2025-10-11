/* rb-patch.js — safe mode keeper (no network interception) */
(function(){
  const KEY='rb_calc_mode'; // 'pairs' | 'span'
  // שמירת מצב כשאתה לוחץ על הכפתורים הקיימים
  document.addEventListener('click', ev=>{
    const t=(ev.target && ev.target.textContent || '').trim();
    if(/זוגות/.test(t)) localStorage.setItem(KEY,'pairs');
    if(/מכניסה ראשונה|יציאה אחרונה/.test(t)) localStorage.setItem(KEY,'span');
    // חשיפת מצב נוכחי לשימוש בקוד שלך
    const span = (localStorage.getItem(KEY)||'pairs')==='span';
    window.RB_CURRENT_MODE = span ? 'FIRST_LAST' : 'SUM_PAIRS';
  }, true);
  // חשיפה ראשונית
  const span = (localStorage.getItem(KEY)||'pairs')==='span';
  window.RB_CURRENT_MODE = span ? 'FIRST_LAST' : 'SUM_PAIRS';
})();
