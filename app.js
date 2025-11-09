const $ = (id) => document.getElementById(id);
const badge = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const setJSON = (id, data) => { const el = $(id); if (!el) return; el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); };
function toast(msg){ const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
function debug(msg){ console.log(msg); const d=$('debug'); if(d) d.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`; }

window.addEventListener('error', e => { debug(`JS error: ${e.message}`); toast('Script error'); });
window.addEventListener('unhandledrejection', e => { debug(`Promise error: ${e.reason}`); toast('Request error'); });

// -------- ENV handling --------
const DEFAULTS = { prod:'https://api.humanhelperai.in', local:'http://127.0.0.1:5000' };
const getMode = () => localStorage.getItem('ENV_MODE') || 'prod';
function getBase(){ const m=getMode(); return m==='custom' ? (localStorage.getItem('API_BASE') || DEFAULTS.prod) : (DEFAULTS[m] || DEFAULTS.prod); }
function paintEnv(){ $('envSelect').value=getMode(); $('customBase').value=getBase(); debug(`ENV=${getMode()} BASE=${getBase()}`); }
function saveEnv(mode){ localStorage.setItem('ENV_MODE', mode); paintEnv(); toast('Environment saved'); }
function saveCustom(){ const v=($('customBase').value||'').trim(); if(!/^https?:\/\//.test(v)) return toast('Use full URL incl. https://'); localStorage.setItem('API_BASE', v); localStorage.setItem('ENV_MODE','custom'); paintEnv(); toast('Base saved'); }
function setTokenBadge(){ badge('tokenBadge', localStorage.getItem('token') ? 'Token set ✅' : 'No token'); }

// -------- fetch helper (adds token to ALL requests if present) --------
function buildHeaders(additional){
  const h = Object.assign({ 'Content-Type':'application/json' }, additional||{});
  const t = localStorage.getItem('token'); if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}
async function safeFetch(url, opts, outId){
  setJSON(outId, 'loading …');
  try{
    const options = Object.assign({ method:'GET', headers: buildHeaders() }, opts || {});
    // If caller passed headers, merge and keep token
    if (opts && opts.headers) options.headers = buildHeaders(opts.headers);
    const res = await fetch(url, options);
    const ct = res.headers.get('content-type') || '';
    let body;
    if (ct.includes('application/json')) {
      body = await res.json();
    } else {
      const txt = await res.text();
      try { body = JSON.parse(txt); } catch { body = txt || `(status ${res.status})`; }
    }
    setJSON(outId, body);
    return { ok: res.ok, body };
  }catch(err){
    const msg = String(err && err.message || err);
    setJSON(outId, { error: msg });
    debug(`fetch fail: ${msg}`);
    return { ok:false, body:{error:msg} };
  }
}

// -------- dashboard helpers --------
function fmtRs(x){ if(x==null||isNaN(+x)) return '—'; return `₹${(+x).toFixed(2)}`; }
function updateDashFromBalance(resp){ if(!resp) return; const bal = resp.balance ?? resp.new_balance ?? resp.wallet ?? null; $('dashBalance').textContent = fmtRs(bal); }
function updateDashFromTxns(list){
  if(!Array.isArray(list)) return;
  if (list.length) {
    const last = list[0];
    $('dashLast').textContent = `${last.type || ''} ${fmtRs(last.amount)}`;
  } else {
    $('dashLast').textContent = '—';
  }
  const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD UTC; OK for display
  const sum = list
    .filter(t => (t.type||'').toLowerCase()==='credit' && (t.note||'').startsWith('earn') && (t.timestamp||'').startsWith(today))
    .reduce((s,t)=> s + (+t.amount||0), 0);
  $('dashToday').textContent = fmtRs(sum);
}
async function refreshMiniDash(mobile){
  if(!mobile) return;
  const base = getBase();
  const b = await safeFetch(`${base}/balance/${mobile}`, { method:'GET' }, 'out'); updateDashFromBalance(b.body);
  const t = await safeFetch(`${base}/transactions/${mobile}`, { method:'GET' }, 'out'); updateDashFromTxns(Array.isArray(t.body)?t.body:[]);
}

// -------- wiring --------
document.addEventListener('DOMContentLoaded', () => {
  // PWA SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  paintEnv(); setTokenBadge(); debug('DOM ready; handlers wiring…');

  $('envSelect').addEventListener('change', e => saveEnv(e.target.value));
  $('saveBase').addEventListener('click', e => { e.preventDefault(); saveCustom(); });

  $('btnHealth').addEventListener('click', async (e) => {
    e.preventDefault();
    badge('healthState','checking…');
    const { body } = await safeFetch(`${getBase()}/health`, { method:'GET' }, 'outHealth');
    badge('healthState', body && body.status ? body.status : 'ok');
    toast('Health ✓');
  });

  $('btnLogin').addEventListener('click', async (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    if(!mobile) return toast('Enter mobile');
    const { body } = await safeFetch(`${getBase()}/login`, {
      method:'POST', headers: buildHeaders({'Content-Type':'application/json'}),
      body: JSON.stringify({ mobile })
    }, 'out');
    if (body && body.token) { localStorage.setItem('token', body.token); setTokenBadge(); toast('Token set'); }
    await refreshMiniDash(mobile);
  });

  $('btnBalance').addEventListener('click', async (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const { body } = await safeFetch(`${getBase()}/balance/${mobile}`, { method:'GET' }, 'out');
    updateDashFromBalance(body);
  });

  $('btnTxns').addEventListener('click', async (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const { body } = await safeFetch(`${getBase()}/transactions/${mobile}`, { method:'GET' }, 'out');
    updateDashFromTxns(Array.isArray(body)?body:[]);
  });

  $('btnEarns').addEventListener('click', async (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const { body } = await safeFetch(`${getBase()}/earnings/${mobile}`, { method:'GET' }, 'out');
    // optional: you could compute from earnings too if needed
    await refreshMiniDash(mobile);
  });

  $('btnDeposit').addEventListener('click', async (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const amount = parseFloat($('depositAmt').value)||0;
    await safeFetch(`${getBase()}/deposit`, {
      method:'POST', headers: buildHeaders({'Content-Type':'application/json'}),
      body: JSON.stringify({ mobile, amount })
    }, 'out');
    await refreshMiniDash(mobile);
    toast('Deposit sent');
  });

  $('btnWithdraw').addEventListener('click', async (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const amount = parseFloat($('withdrawAmt').value)||0;
    const provider = $('provider').value;
    await safeFetch(`${getBase()}/withdraw`, {
      method:'POST', headers: buildHeaders({'Content-Type':'application/json'}),
      body: JSON.stringify({ mobile, amount, provider })
    }, 'out');
    await refreshMiniDash(mobile);
    toast('Withdraw sent');
  });

  $('btnEarn').addEventListener('click', async (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const video_id = ($('contentId').value||'').trim();
    const content_type = $('contentType').value;
    const duration = parseInt(($('duration').value||'0'),10)||0;
    await safeFetch(`${getBase()}/earn`, {
      method:'POST', headers: buildHeaders({'Content-Type':'application/json'}),
      body: JSON.stringify({ mobile, video_id, content_type, duration })
    }, 'out');
    await refreshMiniDash(mobile);
    toast('/earn sent');
  });

  debug('Handlers wired.');
});
