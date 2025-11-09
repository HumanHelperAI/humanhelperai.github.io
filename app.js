// ===== helpers =====
const $ = (id) => document.getElementById(id);

function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1800);
}

function debug(msg) {
  console.log(msg);
  const d = $('debug');
  if (d) d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
}

function setJSON(whereId, obj) {
  const el = $(whereId);
  if (el) el.textContent = JSON.stringify(obj, null, 2);
}

// ===== environment / base URL =====
const DEFAULTS = {
  prod: 'https://api.humanhelperai.in',
  local: 'http://127.0.0.1:5000'
};
function getBase() {
  const mode = localStorage.getItem('ENV_MODE') || 'prod';
  if (mode === 'custom') return localStorage.getItem('API_BASE') || DEFAULTS.prod;
  return DEFAULTS[mode] || DEFAULTS.prod;
}
function applyEnvUI() {
  const mode = localStorage.getItem('ENV_MODE') || 'prod';
  const sel = $('envSelect');
  const inp = $('customBase');
  $('envSelect').value = mode;
  const base = getBase();
  inp.value = base;
  debug(`ENV=${mode} BASE=${base}`);
}
function saveEnv(mode) {
  localStorage.setItem('ENV_MODE', mode);
  applyEnvUI();
  toast('Environment saved');
}
function saveCustomBase() {
  const url = ($('customBase').value || '').trim();
  if (!/^https?:\/\//.test(url)) { toast('Enter full URL incl. https://'); return; }
  localStorage.setItem('API_BASE', url);
  localStorage.setItem('ENV_MODE', 'custom');
  applyEnvUI();
  toast('Base URL saved');
}

// ===== token badge =====
function setTokenBadge() {
  const b = $('tokenBadge');
  const t = localStorage.getItem('token');
  b.textContent = t ? 'Token set ✅' : 'No token';
}

// ===== main wiring =====
document.addEventListener('DOMContentLoaded', () => {
  applyEnvUI();
  setTokenBadge();
  debug('DOM ready; wiring handlers…');

  // env controls
  $('envSelect').addEventListener('change', (e) => saveEnv(e.target.value));
  $('saveBase').addEventListener('click', (e) => { e.preventDefault(); saveCustomBase(); });

  // HEALTH
  $('btnHealth').addEventListener('click', async (e) => {
    e.preventDefault();
    const base = getBase();
    $('healthState').textContent = 'checking…';
    try{
      const r = await fetch(`${base}/health`, { method: 'GET' });
      const j = await r.json();
      setJSON('outHealth', j);
      $('healthState').textContent = j.status || 'ok';
      toast('Health ✓');
    }catch(err){
      $('healthState').textContent = 'error';
      setJSON('outHealth', {error:String(err)});
      toast('Health failed');
    }
  });

  // LOGIN (demo stub – your API may differ)
  $('btnLogin').addEventListener('click', async (e) => {
    e.preventDefault();
    const base = getBase();
    const mobile = ($('mobile').value || '').trim();
    if (!mobile) { toast('Enter mobile'); return; }
    try{
      const r = await fetch(`${base}/login`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mobile })
      });
      const j = await r.json();
      setJSON('out', j);
      if (j.token) {
        localStorage.setItem('token', j.token);
        setTokenBadge();
        toast('Token set ✅');
      } else {
        toast('Login done');
      }
    }catch(err){
      setJSON('out', {error:String(err)});
      toast('Login failed');
    }
  });

  // BALANCE
  $('btnBalance').addEventListener('click', async (e) => {
    e.preventDefault();
    const base = getBase();
    const mobile = ($('mobile').value || '').trim();
    try{
      const r = await fetch(`${base}/balance/${mobile}`);
      setJSON('out', await r.json());
    }catch(err){
      setJSON('out', {error:String(err)});
    }
  });

  // TRANSACTIONS
  $('btnTxns').addEventListener('click', async (e) => {
    e.preventDefault();
    const base = getBase();
    const mobile = ($('mobile').value || '').trim();
    try{
      const r = await fetch(`${base}/transactions/${mobile}`);
      setJSON('out', await r.json());
    }catch(err){
      setJSON('out', {error:String(err)});
    }
  });

  // EARNINGS
  $('btnEarns').addEventListener('click', async (e) => {
    e.preventDefault();
    const base = getBase();
    const mobile = ($('mobile').value || '').trim();
    const token = localStorage.getItem('token') || '';
    try{
      const r = await fetch(`${base}/earnings/${mobile}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      setJSON('out', await r.json());
    }catch(err){
      setJSON('out', {error:String(err)});
    }
  });

  // DEPOSIT
  $('btnDeposit').addEventListener('click', async (e) => {
    e.preventDefault();
    const base = getBase();
    const mobile = ($('mobile').value || '').trim();
    const amount = parseFloat($('depositAmt').value) || 0;
    try{
      const r = await fetch(`${base}/deposit`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mobile, amount })
      });
      setJSON('out', await r.json());
      toast('Deposit sent');
    }catch(err){
      setJSON('out', {error:String(err)});
    }
  });

  // WITHDRAW
  $('btnWithdraw').addEventListener('click', async (e) => {
    e.preventDefault();
    const base = getBase();
    const mobile = ($('mobile').value || '').trim();
    const amount = parseFloat($('withdrawAmt').value) || 0;
    const provider = $('provider').value;
    try{
      const r = await fetch(`${base}/withdraw`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mobile, amount, provider })
      });
      setJSON('out', await r.json());
      toast('Withdraw sent');
    }catch(err){
      setJSON('out', {error:String(err)});
    }
  });

  // EARN
  $('btnEarn').addEventListener('click', async (e) => {
    e.preventDefault();
    const base = getBase();
    const mobile = ($('mobile').value || '').trim();
    const video_id = ($('contentId').value || '').trim();
    const content_type = $('contentType').value;
    const duration = parseInt($('duration').value, 10) || 0;
    try{
      const r = await fetch(`${base}/earn`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mobile, video_id, content_type, duration })
      });
      setJSON('out', await r.json());
      toast('/earn sent');
    }catch(err){
      setJSON('out', {error:String(err)});
    }
  });

  debug('Handlers wired.');
});
