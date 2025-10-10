(() => {
  const APP_SCRIPT_WEB_URL =
    'https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec';

  async function setPolicy(policy) {
    const url = `${APP_SCRIPT_WEB_URL}?fn=settings&policy=${encodeURIComponent(policy)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();
    if (!json.ok) throw new Error('settings update failed');
    console.log('[RB] policy saved:', json);
    return json;
  }

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

  function resolvePolicyFromText(txt) {
    if (/זוגות|pairs/i.test(txt)) return 'SUM_PAIRS';
    return 'FIRST_LAST';
  }

  function readFiltersFromUI() {
    const nameEl = document.querySelector('[name="employee"], select#employee');
    const name = nameEl && nameEl.value ? nameEl.value.trim() : '';
    const fromEl = document.querySelector('[name="from"]');
    const toEl   = document.querySelector('[name="to"]');
    return {
      name: name || '',
      from: fromEl?.value || '',
      to:   toEl?.value || ''
    };
  }

  function renderSummary(json) {
    const table = document.querySelector('#rb-summary-table');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;
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
    if (headerMode)
      headerMode.textContent =
        json.mode === 'SUM_PAIRS'
          ? 'סכ״מ שעות: זוגות'
          : 'סכ״מ שעות: מכניסה ראשונה עד יציאה אחרונה';
  }

  async function refreshReport(mode) {
    try {
      const { name, from, to } = readFiltersFromUI();
      const json = await fetchSummary({ name, from, to, mode });
      renderSummary(json);
    } catch (err) {
      console.warn('refreshReport failed', err);
    }
  }

  function wireButtons() {
    const pairsBtn = document.querySelector('#rb-btn-pairs');
    const flBtn = document.querySelector('#rb-btn-firstlast');

    if (pairsBtn) {
      pairsBtn.addEventListener('click', async () => {
        try {
          await setPolicy('SUM_PAIRS');
          await refreshReport('SUM_PAIRS');
        } catch (e) {
          console.warn(e);
        }
      });
    }

    if (flBtn) {
      flBtn.addEventListener('click', async () => {
        try {
          await setPolicy('FIRST_LAST');
          await refreshReport('FIRST_LAST');
        } catch (e) {
          console.warn(e);
        }
      });
    }
  }

  window.addEventListener('load', () => {
    wireButtons();
    const active = document.querySelector('.rb-mode-active');
    const mode = active
      ? resolvePolicyFromText(active.textContent)
      : 'FIRST_LAST';
    refreshReport(mode).catch(console.warn);
  });
})();
