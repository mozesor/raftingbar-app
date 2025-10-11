/* Rafting Bar — Reports client recompute (FIRST_LAST / SUM_PAIRS) */
(function(){
  const KEY='rb_calc_mode'; // 'pairs' | 'span'
  const isSpan = ()=> (localStorage.getItem(KEY)||'pairs')==='span';
  const GAS_HINT = /(script\.google\.com\/macros\/s\/.+\/exec|A:?[?]|\/exec\?|[^\/]macros)/i;

  function groupBy(arr, keyFn){
    const m=new Map(); for(const x of arr){ const k=keyFn(x); if(!m.has(k)) m.set(k,[]); m.get(k).push(x);} return m;
  }
  const toMs = t => { try{ return t? new Date(t).getTime(): null; }catch(e){ return null; } };

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

  // Wrap fetch: recompute when JSON contains entries/intervals; works for any endpoint pattern above
  const _fetch = window.fetch;
  window.fetch = function(input, init){
    return _fetch.apply(this, arguments).then(async resp=>{
      try{
        const url = (typeof input==='string') ? input : (input && input.url) || '';
        if(!GAS_HINT.test(url)) return resp;
        const ct = resp.headers.get('content-type')||''; if(!/application\/json/.test(ct)) return resp;
        const clone = resp.clone(); const data = await clone.json();
        const spanMode = isSpan();

        if(Array.isArray(data.entries) && data.entries.length){
          const pairs = data.entries.map(e=>{
            if(e.in || e.out) return {name:e.name||e.employee,date:e.date,in:e.in,out:e.out};
            const ts = e.timestamp || e.time || e.ts;
            const d  = e.date || (ts ? new Date(ts).toISOString().slice(0,10) : '');
            return {name:e.name||e.employee,date:d,in:e.action==='IN'?ts:null,out:e.action==='OUT'?ts:null};
          });
          data.rows = computeFromPairs(pairs, spanMode);
          return new Response(new Blob([JSON.stringify(data)],{type:'application/json'}), {status:resp.status, statusText:resp.statusText, headers:resp.headers});
        }

        if(Array.isArray(data.rows) && data.rows.length && (data.rows[0].intervals || data.rows[0].in || data.rows[0].out)){
          const pairs=[];
          for(const r of data.rows){
            if(Array.isArray(r.intervals)){ for(const iv of r.intervals){ pairs.push({name:r.employee||r.name,date:r.date,in:iv.in,out:iv.out}); } }
            else if(r.in || r.out){ pairs.push({name:r.employee||r.name,date:r.date,in:r.in,out:r.out}); }
          }
          data.rows = computeFromPairs(pairs, spanMode);
          return new Response(new Blob([JSON.stringify(data)],{type:'application/json'}), {status:resp.status, statusText:resp.statusText, headers:resp.headers});
        }
        return resp;
      }catch(e){ return resp; }
    });
  };

  // Save selection from your existing buttons (by text)
  document.addEventListener('click', ev=>{
    const t=(ev.target && ev.target.textContent || '').trim();
    if(/זוגות/.test(t)) localStorage.setItem(KEY,'pairs');
    if(/מכניסה ראשונה|יציאה אחרונה/.test(t)) localStorage.setItem(KEY,'span');
  }, true);
})();