/* Rafting Bar – Front patch
   - חשיפה של שני כפתורי מצב חישוב
   - עדכון Settings ב-GAS ואח"כ רענון הדו"ח
   איך להשתמש:
   1) שימי <script src="./rb-patch.js"></script> ממש לפני </body>.
   2) הגדירי את window.RB_GAS_EXEC_URL לכתובת ה-exec שלך (ללא סלאשים בסוף).
*/

(function() {
  const GAS = (window.RB_GAS_EXEC_URL || '').replace(/\/+$/,'');
  if (!GAS) {
    console.warn('[RB] RB_GAS_EXEC_URL חסר. דלגנו על הזרקת הכפתורים.');
    return;
  }

  // יצירת מחסנית כפתורים
  const bar = document.createElement('div');
  bar.dir = 'rtl';
  bar.style.cssText = 'display:flex;gap:8px;justify-content:center;margin:12px 0;flex-wrap:wrap';

  const btnFirstLast = mkBtn('מכניסה ראשונה עד יציאה אחרונה');
  const btnPairs     = mkBtn('כניסות⇄יציאות (זוגות)');

  bar.appendChild(btnFirstLast);
  bar.appendChild(btnPairs);

  // השחלה לפני אזור הכותרת/פעולות (אם אין, לפני הדו"ח)
  const anchor = document.querySelector('.header, .actions, h1, h2, h3, [data-report-anchor]') || document.body;
  anchor.parentNode.insertBefore(bar, anchor.nextSibling);

  btnFirstLast.addEventListener('click', ()=>applyPolicy('FIRST_LAST'));
  btnPairs.addEventListener('click',     ()=>applyPolicy('SUM_PAIRS'));

  function mkBtn(label) {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = 'btn';
    b.style.cssText = 'background:#1976d2;color:#fff;border:none;border-radius:8px;padding:10px 14px;font-size:14px;cursor:pointer';
    return b;
  }

  async function applyPolicy(policy) {
    try {
      btnFirstLast.disabled = btnPairs.disabled = true;
      // עדכון הסביבה
      const url = GAS + '?fn=settings&policy=' + encodeURIComponent(policy);
      const resp = await fetch(url, { method: 'GET', mode:'cors' });
      const data = await resp.json().catch(()=>({}));
      console.log('[RB] settings ->', data);

      // רענון דו"ח – לנסות לכפתור "הצג דוח", ואם אין – רענון כללי
      const showBtn = document.querySelector('button, .btn, .chip, .toggle, span');
      // חפש משהו שכתוב עליו "הצג דוח"
      let clicked = false;
      document.querySelectorAll('button, .btn, .chip, .toggle, span').forEach(el=>{
        const t = (el.textContent||'').trim();
        if (/^הצג דוח$/.test(t) && !clicked) {
          el.click();
          clicked = true;
        }
      });
      if (!clicked) location.reload();
    } catch (err) {
      console.error('[RB] settings error', err);
    } finally {
      btnFirstLast.disabled = btnPairs.disabled = false;
    }
  }
})();
