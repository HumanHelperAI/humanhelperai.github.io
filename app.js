/* ---------- tiny utils ---------- */
const $ = (id) => document.getElementById(id);
const badge = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const setJSON = (id, data) => { const el = $(id); if (el) el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); };
function toast(msg){ const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
function debug(msg){ console.log(msg); const d=$('debug'); if(d) d.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`; }

/* global error catcher -> show on screen */
window.addEventListener('error', e => { debug(`JS error: ${e.message}`); toast('Script error'); });
window.addEventListener('unhandledrejection', e => { debug(`Promise error: ${e.reason}`); toast('Request error'); });

/* ---------- environment ---------- */
const DEFAULTS = { prod:'https://api.humanhelperai.in', local:'http://127.0.0.1:5000' };
const getMode = () => localStorage.getItem('ENV_MODE') || 'prod';
function getBase(){ const m=getMode(); return m==='custom' ? (localStorage.getItem('API_BASE') || DEFAULTS.prod) : (DEFAULTS[m] || DEFAULTS.prod); }
function paintEnv(){
  $('envSelect').value=getMode();
  $('customBase').value=getBase();
  debug(`ENV=${getMode()} BASE=${getBase()}`);
}
function saveEnv(mode){ localStorage.setItem('ENV_MODE', mode); paintEnv(); toast('Environment saved'); }
function saveCustom(){
  const v=($('customBase').value||'').trim();
  if(!/^https?:\/\//.test(v)) return toast('Use full URL incl. https://');
  localStorage.setItem('API_BASE', v); localStorage.setItem('ENV_MODE','custom'); paintEnv(); toast('Base saved');
}
function setTokenBadge(){ badge('tokenBadge', localStorage.getItem('token') ? 'Token set ✅' : 'No token'); }

/* ---------- safe fetch that never leaves UI blank ---------- */
async function safeFetch(url, opts, outId){
  setJSON(outId, 'loading …');
  try{
    const res = await fetch(url, opts);
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

/* ---------- wire UI ---------- */
document.addEventListener('DOMContentLoaded', () => {
  paintEnv(); setTokenBadge(); debug('DOM ready; handlers wiring…');

  $('envSelect').addEventListener('change', e => saveEnv(e.target.value));
  $('saveBase').addEventListener('click', e => { e.preventDefault(); saveCustom(); });

  // Health
  $('btnHealth').addEventListener('click', async (e) => {
    e.preventDefault();
    badge('healthState','checking…');
    const { body } = await safeFetch(`${getBase()}/health`, { method:'GET' }, 'outHealth');
    badge('healthState', body && body.status ? body.status : 'ok');
    toast('Health ✓');
  });

  // Login (demo: saves token if present)
  $('btnLogin').addEventListener('click', async (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    if(!mobile) return toast('Enter mobile');
    const { body } = await safeFetch(`${getBase()}/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ mobile })
    }, 'out');
    if (body && body.token) { localStorage.setItem('token', body.token); setTokenBadge(); toast('Token set'); }
  });

  // Balance
  $('btnBalance').addEventListener('click', (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    safeFetch(`${getBase()}/balance/${mobile}`, { method:'GET' }, 'out');
  });

  // Transactions
  $('btnTxns').addEventListener('click', (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    safeFetch(`${getBase()}/transactions/${mobile}`, { method:'GET' }, 'out');
  });

  // Earnings
  $('btnEarns').addEventListener('click', (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const headers = {};
    const t=localStorage.getItem('token'); if(t) headers['Authorization']=`Bearer ${t}`;
    safeFetch(`${getBase()}/earnings/${mobile}`, { method:'GET', headers }, 'out');
  });

  // Deposit
  $('btnDeposit').addEventListener('click', (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const amount = parseFloat($('depositAmt').value)||0;
    safeFetch(`${getBase()}/deposit`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ mobile, amount })
    }, 'out').then(()=>toast('Deposit sent'));
  });

  // Withdraw
  $('btnWithdraw').addEventListener('click', (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const amount = parseFloat($('withdrawAmt').value)||0;
    const provider = $('provider').value;
    safeFetch(`${getBase()}/withdraw`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ mobile, amount, provider })
    }, 'out').then(()=>toast('Withdraw sent'));
  });

  // Earn
  $('btnEarn').addEventListener('click', (e) => {
    e.preventDefault();
    const mobile = ($('mobile').value||'').trim();
    const video_id = ($('contentId').value||'').trim();
    const content_type = $('contentType').value;
    const duration = parseInt(($('duration').value||'0'),10)||0;
    safeFetch(`${getBase()}/earn`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ mobile, video_id, content_type, duration })
    }, 'out').then(()=>toast('/earn sent'));
  });

  debug('Handlers wired.');
});
