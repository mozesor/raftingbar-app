
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
