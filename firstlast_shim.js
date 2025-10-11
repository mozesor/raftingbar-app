/*! RaftingBar FIRST_LAST shim (no DOM changes)
 *  - Forces mode=FIRST_LAST on Apps Script summary calls
 *  - Converts rows -> entries (one pair/day: first-in, last-out)
 *  - Adds tiny polyfills to avoid legacy errors
 */
(function(){
  // Polyfills (safe no-ops)
  window.dayInTime  = window.dayInTime  || function(){ return null; };
  window.dayOutTime = window.dayOutTime || function(){ return null; };
  window.dayHours   = window.dayHours   || function(){ return 0; };

  const ORIG_FETCH = window.fetch;

  function toLocalIso(iso){
    const d = new Date(iso);
    const p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  window.fetch = function(input, init){
    // Normalize to a Request to make URL surgery easy
    const req = (typeof input === 'string') ? new Request(input, init) : input;
    const url = new URL(req.url, location.href);

    // Only touch Apps Script summary calls
    const isSummary = url.hostname.includes('script.google.com') &&
                      url.searchParams.get('report') === 'summary';
    if (!isSummary) return ORIG_FETCH(req);

    // Force FIRST_LAST
    url.searchParams.set('mode', 'FIRST_LAST');

    const req2 = new Request(url.toString(), req);
    return ORIG_FETCH(req2).then(async (res)=>{
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) return res;

      const data = await res.clone().json().catch(()=>null);
      if (!data || !data.ok || !Array.isArray(data.rows)) return res;

      // Convert rows -> entries (one interval per day)
      const fixedEntries = [];
      for (const r of data.rows){
        const itv = r && r.intervals && r.intervals[0];
        if (!itv) continue;
        fixedEntries.push({
          name: r.employee || '',
          date: r.date,
          in:  toLocalIso(itv.in),
          out: toLocalIso(itv.out)
        });
      }
      data.entries    = fixedEntries;
      data.entriesRaw = data.entriesRaw || fixedEntries;

      const body = JSON.stringify(data);
      return new Response(body, {
        status: res.status,
        statusText: res.statusText,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  };
})();
