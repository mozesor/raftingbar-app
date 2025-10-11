
// entry_gate.js — One-time entry code gate for RaftingBar
(function(){
  function needEntry(){ try { return localStorage.getItem('entryUnlocked') !== '1'; } catch(e){ return true; } }
  function injectStyles(){
    var css = [
      '#entryOverlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:9999;font-family:inherit}',
      '#entryBox{background:#fff;width:min(92vw,380px);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:18px;direction:rtl}',
      '#entryBox h2{margin:0 0 10px;font-size:18px}','#entryBox p{margin:0 0 10px;color:#555}',
      '#entryBox .input{width:100%;padding:10px;border:1px solid #d0d5ff;border-radius:10px}',
      '#entryBox .btn{margin-top:10px;width:100%;background:#4f46e5;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}',
      '#entryCancelBtn{background:#9aa1ff!important}'
    ].join('');
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  }
  function showOverlay(){
    if (document.getElementById('entryOverlay')){ document.getElementById('entryOverlay').style.display='flex'; return; }
    injectStyles();
    var ov=document.createElement('div'); ov.id='entryOverlay';
    var bx=document.createElement('div'); bx.id='entryBox';
    bx.innerHTML=[
      '<h2>קוד כניסה</h2>',
      '<p>הכנס קוד חד־פעמי לכניסה ראשונית:</p>',
      '<input id="entryCodeInput" class="input" type="password" placeholder="הכנס קוד" />',
      '<button id="entryEnterBtn" class="btn">כניסה</button>',
      '<button id="entryCancelBtn" class="btn">ביטול</button>'
    ].join('');
    ov.appendChild(bx); document.body.appendChild(ov);
    document.getElementById('entryEnterBtn').onclick=function(ev){
      try{ ev.preventDefault(); }catch(e){}
      var v=String((document.getElementById('entryCodeInput')||{}).value||'').trim();
      if (v==='97531'){ try{ localStorage.setItem('entryUnlocked','1'); }catch(e){}; ov.style.display='none'; }
      else { alert('קוד שגוי. נסה שוב.'); var i=document.getElementById('entryCodeInput'); if(i){ i.value=''; i.focus(); } }
      return false;
    };
    document.getElementById('entryCancelBtn').onclick=function(ev){
      try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(e){}
      var i=document.getElementById('entryCodeInput'); if(i){ i.value=''; i.focus(); }
      alert('יש להזין קוד כדי להמשיך'); return false;
    };
    var input=document.getElementById('entryCodeInput');
    if (input){ input.addEventListener('keydown', function(e){ if (e.key==='Enter'){ e.preventDefault(); document.getElementById('entryEnterBtn').click(); } }); setTimeout(function(){ input.focus(); }, 50); }
    ov.style.display='flex';
  }
  try{ var qs=new URLSearchParams(window.location.search); if (qs.get('forceEntry')==='1'){ localStorage.removeItem('entryUnlocked'); } }catch(e){}
  function init(){ if (needEntry()) showOverlay(); }
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();


/* === RB Reports — client recompute + mode support (appended) === */
(function(){
  if (window.__RB_RECOMPUTE_PATCH__) return; // avoid double load
  window.__RB_RECOMPUTE_PATCH__ = true;

  const KEY='rb_calc_mode'; // 'pairs' | 'span'
  const isSpan = ()=> (localStorage.getItem(KEY)||'pairs')==='span'; // span => FIRST_LAST
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

  // שמירת מצב בעת לחיצה על הכפתורים הקיימים שלך
  document.addEventListener('click', ev=>{
    const t=(ev.target && ev.target.textContent || '').trim();
    if(/זוגות/.test(t)) localStorage.setItem(KEY,'pairs');
    if(/מכניסה ראשונה|יציאה אחרונה/.test(t)) localStorage.setItem(KEY,'span');
  }, true);
})();
