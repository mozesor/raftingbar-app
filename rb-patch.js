/* rb-patch.js — Mode toggle + fetch injection (default FIRST_LAST) */
(function () {
  var FIRST = 'FIRST_LAST';
  var PAIRS = 'SUM_PAIRS';
  var STORAGE_KEY = 'RB_CALC_MODE';

  function setMode(mode) {
    localStorage.setItem(STORAGE_KEY, mode);
    paintMode(mode);
    console.log('[RB] Mode:', mode === FIRST ? 'מכניסה ראשונה עד יציאה אחרונה' : 'כניסות⇄יציאות (זוגות)');
  }
  function getMode() { return localStorage.getItem(STORAGE_KEY) || FIRST; }

  function findButton(regexes) {
    var nodes = Array.from(document.querySelectorAll('button, .btn, .chip, span, div'));
    for (var i=0;i<nodes.length;i++) {
      var txt = (nodes[i].textContent || '').replace(/\s+/g,'').trim();
      for (var j=0;j<regexes.length;j++) {
        if (regexes[j].test(txt)) return nodes[i];
      }
    }
    return null;
  }

  function paintMode(mode) {
    try {
      var btnPairs = findButton([/כניס.*יציא.*זוג/]);
      var btnFirst = findButton([/מכניס.*ראשונ.*עד.*יציא.*אחרונ/]);
      [btnPairs, btnFirst].forEach(function(b){
        if (!b) return;
        b.classList.remove('rb-active-mode');
        b.style.outline = '';
      });
      var target = (mode === PAIRS ? btnPairs : btnFirst);
      if (target) {
        target.classList.add('rb-active-mode');
        target.style.outline = '2px solid #1976d2';
      }
    } catch(e) { /* noop */ }
  }

  function pushSettings(policy) {
    try {
      var base = (window.RB_GAS_EXEC_URL || '').replace(/\/+$/,'');
      if (!base) { console.warn('[RB] GAS EXEC URL missing'); return; }
      var u = base + '?fn=settings&policy=' + encodeURIComponent(policy) + '&ts=' + Date.now();
      fetch(u).then(function(r){return r.json();}).then(function(j){
        console.log('[RB] settings ->', j);
      }).catch(function(err){ console.warn('[RB] settings error', err); });
    } catch(e) {}
  }

  function refreshReport() {
    var clicked = false;
    Array.from(document.querySelectorAll('button, .btn, .chip, span')).forEach(function(el){
      var t = (el.textContent||'').trim();
      if (!clicked && /^הצג דוח$/.test(t)) { el.click(); clicked = true; }
    });
    if (!clicked) { if (document.visibilityState === 'visible') location.reload(); }
  }

  var _fetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    try {
      var url = (typeof input === 'string') ? input : (input && input.url) ? input.url : '';
      if (url && url.indexOf('/exec') !== -1 && url.indexOf('report=summary') !== -1) {
        var u = new URL(url, location.origin);
        u.searchParams.set('mode', getMode());
        u.searchParams.set('ts', Date.now());
        input = (typeof input === 'string') ? u.toString() : new Request(u.toString(), input);
        console.log('[RB] summary fetch -> mode=' + getMode());
      }
    } catch(e) {}
    return _fetch(input, init);
  };

  function wire() {
    var btnPairs = findButton([/כניס.*יציא.*זוג/]);
    var btnFirst = findButton([/מכניס.*ראשונ.*עד.*יציא.*אחרונ/]);
    if (btnPairs && !btnPairs._rb_wired) {
      btnPairs._rb_wired = true;
      btnPairs.addEventListener('click', function(){
        setMode(PAIRS);
        pushSettings(PAIRS);
        refreshReport();
      });
    }
    if (btnFirst && !btnFirst._rb_wired) {
      btnFirst._rb_wired = true;
      btnFirst.addEventListener('click', function(){
        setMode(FIRST);
        pushSettings(FIRST);
        refreshReport();
      });
    }
    paintMode(getMode());
  }

  var mo = new MutationObserver(function(){ wire(); });
  mo.observe(document.documentElement || document.body, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setMode(getMode()); wire(); });
  } else {
    setMode(getMode()); wire();
  }
})();