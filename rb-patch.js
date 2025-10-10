/* rb-patch.js
 * גשר פשוט בין ה-UI לבין Apps Script:
 * - שומר מדיניות חישוב (FIRST_LAST / SUM_PAIRS)
 * - מושך דוח בהתאם למדיניות הנוכחית
 */

(() => {
  // <<< חשוב: להדביק כאן את "כתובת יישום האינטרנט" מ־Manage deployments >>>
  const APP_SCRIPT_WEB_URL =
    'https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec';

  // שמירה של המדיניות
  async function setPolicy(policy) {
    const url = `${APP_SCRIPT_WEB_URL}?fn=settings&policy=${encodeURIComponent(policy)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();
    if (!json.ok) throw new Error('settings update failed');
    console.log('[RB] policy saved:', json);
    return json;
  }

  // שליפת דוח עם המדיניות הנתונה
  async function fetchSummary({ name, from, to, mode }) {
    const qs = new URLSearchParams({ report: 'summary' });
    if (mode) qs.set('mode', mode);
    if (name) qs.set('name', name);
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    const url = `${APP_SCRIPT_WEB_URL}?${qs.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();
    if (!json.ok) throw new Error('summary failed');
    console.log('[RB] summary:', json);
    return json;
  }

  // עוזר: קריאת טקסט הכפתור וקביעה איזו מדיניות נבחרה
  function resolvePolicyFromText(txt) {
    // "כניסות↔יציאות (זוגות)" => SUM_PAIRS
    // "מכניסה ראשונה עד יציאה אחרונה" => FIRST_LAST
    if (/זוגות|pairs/i.test(txt)) return 'SUM_PAIRS';
    return 'FIRST_LAST';
  }

  // עוזר: מוצא את שם העובד/טווחים אם יש בחלון
  function readFiltersFromUI() {
    const nameEl = document.querySelector('[name="employee"], select#employee'); // התאם לבחירה אצלך
    const name = nameEl && nameEl.value ? nameEl.value.trim() : '';
    // תאריכים – אם יש אצלך DatePicker שנותן YYYY-MM-DD
    const fromEl = document.querySelector('[name="from"]');
    const toEl   = document.querySelector('[name="to"]');
    return {
      name: name || '',
      from: fromEl?.value || '',
      to:   toEl?.value || ''
    };
  }

  // ציור הטבלה – קרא לפונקציה שמציירת אצלך (נוגעת DOM)
  function renderSummary(json) {
    // אצלך כבר יש פונקציה שמעדכנת את הטבלה.
    // אם אין, הנה דוגמה מינימלית שתדרוס את הטבלה המרכזית.
    const table = document.querySelector('#rb-summary-table');
    if (!table) return; // אם אין, תמשיך להשתמש בקוד הקיים שלך

    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    json.rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.date}</td>
        <td>${r.in || '-'}</td>
        <td>${r.out || '-'}</td>
        <td>${r.hours}</td>
      `;
      tbody.appendChild(tr);
    });
    const headerMode = document.querySelector('#rb-mode-title');
    if (headerMode) headerMode.textContent = (json.mode === 'SUM_PAIRS' ? 'סכ״מ שעות: זוגות' : 'סכ״מ שעות: מכניסה ראשונה עד יציאה אחרונה');
  }

  // רענון הדוח לאחר שמירה/בטעינה
  async function refreshReport(mode) {
    const { name, from, to } = readFiltersFromUI();
    const json = await fetchSummary({ name, from, to, mode });
    renderSummary(json);
  }

  // חיבור הכפתורים
  function wireButtons() {
    const pairsBtn = document.querySelector('#rb-btn-pairs');   // "כניסות↔יציאות (זוגות)"
    const flBtn    = document.querySelector('#rb-btn-firstlast'); // "מכניסה ראשונה עד יציאה אחרונה"

    if (pairsBtn) {
      pairsBtn.addEventListener('click', async () => {
        try {
          await setPolicy('SUM
