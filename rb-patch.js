/* Rafting Bar — Enhanced client recompute for GAS & Google Sheets API */
(function(){
  const KEY='rb_calc_mode'; // 'pairs' | 'span'
  const isSpan = ()=> (localStorage.getItem(KEY)||'pairs')==='span'; // span => FIRST_LAST

  // Match broad Google endpoints: Apps Script, Google Sheets API, or docs gviz
  const RE_ENDPOINT = /(script\.google\.com\/macros\/s\/.+\/exec|sheets\.googleapis\.com\/v4\/spreadsheets|docs\.google\.com\/spreadsheets\/.+\/gviz)/i;

  // ----- helpers -----
  const toMs = t => { try{ return t? new Date(t).getTime(): null; }catch(e){ return null; } };
  function groupBy(arr, keyFn){ const m=new Map(); for(const x of arr){ const k=keyFn(x); if(!m.has(k)) m.set(k,[]); m.get(k).push(x);} return m; }

  function computeFromPairs(pairs, spanMode){
    const by = groupBy(pairs, r=> (r.name||r.employee||'').trim()+'|'+(r.date||'').slice(0,10));
    const out=[];
    for(const [k,list] of by){
      const [name,date]=k.split('|');
      const norm = list.map(r=>({ti: toMs(r.in)||toMs(r.tin)||toMs(r.inTime)||null,
                                 to: toMs(r.out)||toMs(r.tout)||toMs(r.outTime)||null}))
                       .filter(x=>x.ti||x.to).sort((a,b)=>(a.ti||0)-(b.ti||0));
      let total=0, iv=[];
      if(spanMode){
        const fi = norm.find(x=>x.ti!=null)?.ti ?? null;
        const lo = [...norm].reverse().find(x=>x.to!=null)?.to ?? null;
        if(fi!=null && lo!=null && lo>fi){ total=lo-fi; iv=[{in:new Date(fi).toISOString(), out:new Date(lo).toISOString()}]; }
      }else{
        for(const x of norm){ if(x.ti!=null && x.to!=null && x.to>x.ti){ total+=x.to-x.ti; iv.push({in:new Date(x.ti).toISOString(),out:new Date(x.to).toISOString()}); } }
      }
      out.push({employee:name, date, totalMs:total, intervals:iv});
    }
    out.sort((a,b)=> a.date<b.date? -1 : a.date>b.date? 1 : 0);
    return out;
  }

  function parseSheetValuesJson(data){
    // Expected: { values: [ [header...], [row...], ... ] }  or { valueRanges:[{values:[...]}] }
    const val = Array.isArray(data?.values) ? data.values
               : (Array.isArray(data?.valueRanges) && data.valueRanges[0]?.values) ? data.valueRanges[0].values
               : null;
    if(!val || !val.length) return null;
    const header = val[0].map(x=> String(x||'').trim().toLowerCase());
    // Try to find important columns
    const idx = {
      name: header.findIndex(h=> /(name|שם)/.test(h)),
      action: header.findIndex(h=> /(action|פעולה|type)/.test(h)),
      ts: header.findIndex(h=> /(timestamp|time|שעת|date\s*time)/.test(h)),
      date: header.findIndex(h=> /^date$|תאריך/.test(h)),
      in: header.findIndex(h=> /^in$|כניסה/.test(h)),
      out: header.findIndex(h=> /^out$|יציאה/.test(h)),
    };
    const pairs=[];
    for(let i=1;i<val.length;i++){
      const row = val[i]||[];
      const name = idx.name>=0 ? row[idx.name] : '';
      const ts   = idx.ts>=0   ? row[idx.ts]   : '';
      const dcol = idx.date>=0 ? row[idx.date] : '';
      const incol= idx.in>=0   ? row[idx.in]   : '';
      const outc = idx.out>=0  ? row[idx.out]  : '';
      if(incol || outc){
        pairs.push({name, date: dcol || (incol||outc||'').slice(0,10), in: incol||null, out: outc||null});
      }else if(ts){
        const act = (idx.action>=0 ? String(row[idx.action]||'') : '').toLowerCase();
        const action = /in|checkin|כניסה/.test(act) ? 'IN' : (/out|checkout|יציאה/.test(act) ? 'OUT' : '');
        const date = dcol || (String(ts).length>=10 ? new Date(ts).toISOString().slice(0,10) : '');
        pairs.push({name, date, in: action==='IN'? ts : null, out: action==='OUT'? ts : null});
      }
    }
    return pairs;
  }

  // ----- wrapper -----
  const _fetch = window.fetch;
  window.fetch = function(input, init){
    return _fetch.apply(this, arguments).then(async resp=>{
      try{
        const url = (typeof input==='string') ? input : (input && input.url) || '';
        if(!RE_ENDPOINT.test(url)) return resp;
        const ct = resp.headers.get('content-type')||'';
        if(!/json|javascript/.test(ct)) return resp;

        const clone = resp.clone();
        let data;
        // Try JSON first; if fails (e.g., gviz with leading ")]}'"), clean it
        try { data = await clone.json(); }
        catch(_){
          const txt = await resp.clone().text();
          const cleaned = txt.replace(/^\)\]\}'\n?/, '');
          try { data = JSON.parse(cleaned); } catch(e2){ return resp; }
        }

        const spanMode = isSpan();

        // 1) Apps Script style
        if(Array.isArray(data?.entries) || Array.isArray(data?.rows)){
          let pairs=null;
          if(Array.isArray(data.entries)){
            pairs = data.entries.map(e=> e.in||e.out
              ? {name:e.name||e.employee,date:e.date,in:e.in,out:e.out}
              : (function(){const ts=e.timestamp||e.time||e.ts;
                            const d=e.date||(ts?new Date(ts).toISOString().slice(0,10):''); 
                            const act=(e.action||'').toUpperCase(); 
                            return {name:e.name||e.employee,date:d,in:act==='IN'?ts:null,out:act==='OUT'?ts:null};})());
          } else {
            // rows with intervals/in/out
            const pairsTmp=[];
            for(const r of data.rows){
              if(Array.isArray(r.intervals)){ for(const iv of r.intervals){ pairsTmp.push({name:r.employee||r.name,date:r.date,in:iv.in,out:iv.out}); } }
              else if(r.in || r.out){ pairsTmp.push({name:r.employee||r.name,date:r.date,in:r.in,out:r.out}); }
            }
            pairs = pairsTmp.length ? pairsTmp : null;
          }
          if(pairs){
            data.rows = computeFromPairs(pairs, spanMode);
            return new Response(new Blob([JSON.stringify(data)],{type:'application/json'}), {status:resp.status, statusText:resp.statusText, headers:resp.headers});
          }
        }

        // 2) Google Sheets API style (values[])
        const pairs = parseSheetValuesJson(data);
        if(pairs && pairs.length){
          const rows = computeFromPairs(pairs, spanMode);
          const payload = { ok:true, rows: rows, entries: pairs }; // normalized
          return new Response(new Blob([JSON.stringify(payload)],{type:'application/json'}), {status:200, statusText:'OK', headers: new Headers({'content-type':'application/json'})});
        }

        return resp;
      }catch(e){
        return resp;
      }
    });
  };

  // capture button clicks to save selection
  document.addEventListener('click', ev=>{
    const t=(ev.target && ev.target.textContent || '').trim();
    if(/זוגות/.test(t)) localStorage.setItem(KEY,'pairs');
    if(/מכניסה ראשונה|יציאה אחרונה/.test(t)) localStorage.setItem(KEY,'span');
  }, true);
})();