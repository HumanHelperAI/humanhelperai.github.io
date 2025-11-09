/* Human Helper — colorful demo UI
   - Environment switcher (prod/local/custom)
   - Spinner + toasts
   - Pretty JSON console
   - All API calls with robust error handling
*/

const $$ = (q, el = document) => el.querySelector(q);
const out = $$('#out');
const healthOut = $$('#healthOut');
const spinner = $$('#spinner');
const toasts = $$('#toasts');

const ENV_SELECT = $$('#env');
const BASE_INPUT = $$('#base');
const SAVE_ENV = $$('#saveEnv');
const STATUS_BADGE = $$('#statusBadge');
const TOKEN_STATE = $$('#tokenState');

const LS = {
  BASE: 'hh.base',
  TOKEN: 'hh.token',
  MOBILE: 'hh.mobile',
};

// ---------- UI helpers ----------
function setLoading(on) {
  spinner.style.display = on ? 'grid' : 'none';
}
function showToast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${type === 'err' ? 'err' : ''}`;
  t.textContent = msg;
  toasts.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function pretty(v) {
  try { return JSON.stringify(v, null, 2); }
  catch { return String(v); }
}
function setConsole(el, v) { el.textContent = pretty(v); }

// ---------- ENV handling ----------
function initEnv() {
  const storedBase = localStorage.getItem(LS.BASE) || 'https://api.humanhelperai.in';
  BASE_INPUT.value = storedBase;
  if (storedBase === 'https://api.humanhelperai.in') ENV_SELECT.value = storedBase;
  else if (storedBase === 'http://127.0.0.1:5000') ENV_SELECT.value = storedBase;
  else ENV_SELECT.value = 'custom';
}
function currentBase() {
  return BASE_INPUT.value.trim().replace(/\/+$/,'');
}
SAVE_ENV.addEventListener('click', () => {
  const base = currentBase();
  if (!/^https?:\/\//.test(base)) return showToast('Enter valid http(s) URL', 'err');
  localStorage.setItem(LS.BASE, base);
  showToast(`Base set → ${base}`);
});
ENV_SELECT.addEventListener('change', () => {
  if (ENV_SELECT.value === 'custom') { BASE_INPUT.focus(); return; }
  BASE_INPUT.value = ENV_SELECT.value;
  localStorage.setItem(LS.BASE, BASE_INPUT.value);
  showToast(`Base switched → ${BASE_INPUT.value}`);
});

// ---------- Auth / state ----------
function setToken(token) {
  if (token) {
    localStorage.setItem(LS.TOKEN, token);
    TOKEN_STATE.textContent = 'Token set ✔';
    TOKEN_STATE.style.borderColor = '#21d19f';
  } else {
    localStorage.removeItem(LS.TOKEN);
    TOKEN_STATE.textContent = 'No token';
    TOKEN_STATE.style.borderColor = '';
  }
}
function getToken() { return localStorage.getItem(LS.TOKEN) || ''; }

// ---------- Networking ----------
async function fetchJson(path, { method = 'GET', body, auth = false } = {}) {
  const url = `${currentBase()}${path}`;
  const headers = { 'Accept': 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = getToken();
    if (!t) throw new Error('No token set. Login first.');
    headers['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch(e){ throw new Error(`Bad JSON: ${text}`); }
  if (!res.ok) {
    const msg = json?.detail?.detail || json?.detail || json?.error || res.statusText;
    const err = new Error(msg || 'Request failed');
    err.payload = json;
    throw err;
  }
  return json;
}

// ---------- Validators ----------
function parseMobileRaw() {
  const m = $$('#mobile').value.replace(/\D/g,'').slice(-10);
  if (m.length !== 10) throw new Error('Enter 10-digit mobile');
  localStorage.setItem(LS.MOBILE, m);
  return m;
}
function getMobileFromState() {
  const m = localStorage.getItem(LS.MOBILE);
  if (!m) throw new Error('No mobile set. Login again.');
  return m;
}

// ---------- Actions ----------
async function doHealth() {
  setLoading(true);
  try {
    const j = await fetchJson('/health');
    setConsole(healthOut, j);
    STATUS_BADGE.textContent = j.status || 'ok';
    showToast('Health OK');
  } catch (e) {
    setConsole(healthOut, e.payload || { error: e.message });
    STATUS_BADGE.textContent = 'error';
    showToast(e.message, 'err');
  } finally { setLoading(false); }
}

async function doLogin() {
  setLoading(true);
  try {
    const mobile = parseMobileRaw();
    const j = await fetchJson('/login', { method:'POST', body:{ mobile } });
    const token = j?.token;
    if (!token) throw new Error('No token returned');
    setToken(token);
    showToast('Logged in');
    setConsole(out, j);
  } catch (e) {
    setToken('');
    setConsole(out, e.payload || { error: e.message });
    showToast(e.message, 'err');
  } finally { setLoading(false); }
}

async function doBalance() {
  setLoading(true);
  try {
    const mobile = getMobileFromState();
    const j = await fetchJson(`/balance/${mobile}`, { auth:true });
    setConsole(out, j);
    showToast('Balance fetched');
  } catch (e) {
    setConsole(out, e.payload || { error: e.message });
    showToast(e.message, 'err');
  } finally { setLoading(false); }
}

async function doTxns() {
  setLoading(true);
  try {
    const mobile = getMobileFromState();
    const j = await fetchJson(`/transactions/${mobile}`, { auth:true });
    setConsole(out, j);
    showToast('Transactions fetched');
  } catch (e) {
    setConsole(out, e.payload || { error: e.message });
    showToast(e.message, 'err');
  } finally { setLoading(false); }
}

async function doEarns() {
  setLoading(true);
  try {
    const mobile = getMobileFromState();
    const j = await fetchJson(`/earnings/${mobile}`, { auth:true });
    setConsole(out, j);
    showToast('Earnings fetched');
  } catch (e) {
    setConsole(out, e.payload || { error: e.message });
    showToast(e.message, 'err');
  } finally { setLoading(false); }
}

async function doDeposit() {
  setLoading(true);
  try {
    const mobile = getMobileFromState();
    const amt = Number($$('#depositAmt').value || 0);
    const j = await fetchJson('/deposit', { method:'POST', body:{ mobile, amount: amt }, auth:true });
    setConsole(out, j);
    showToast('Deposit posted');
  } catch (e) {
    setConsole(out, e.payload || { error: e.message });
    showToast(e.message, 'err');
  } finally { setLoading(false); }
}

async function doWithdraw() {
  setLoading(true);
  try {
    const mobile = getMobileFromState();
    const amount = Number($$('#withdrawAmt').value || 0);
    const provider = $$('#withdrawProv').value;
    const j = await fetchJson('/withdraw', { method:'POST', body:{ mobile, amount, provider }, auth:true });
    setConsole(out, j);
    showToast('Withdraw initiated');
  } catch (e) {
    setConsole(out, e.payload || { error: e.message });
    showToast(e.message, 'err');
  } finally { setLoading(false); }
}

async function doEarn() {
  setLoading(true);
  try {
    const mobile = getMobileFromState();
    const video_id = ($$('#earnId').value || '').trim() || `vid-${Date.now()}`;
    const content_type = $$('#earnType').value;
    const duration = Number($$('#earnDur').value || 0);
    const body = { mobile, video_id, content_type, duration };
    const j = await fetchJson('/earn', { method:'POST', body, auth:true });
    setConsole(out, j);
    showToast(j?.message || 'Earned');
  } catch (e) {
    setConsole(out, e.payload || { error: e.message });
    showToast(e.message, 'err');
  } finally { setLoading(false); }
}

// ---------- Wire up ----------
function initMobilePrefill() {
  const m = localStorage.getItem(LS.MOBILE);
  if (m) $$('#mobile').value = m;
  const t = localStorage.getItem(LS.TOKEN);
  setToken(t);
}
function bind() {
  $$('#btnHealth').addEventListener('click', doHealth);
  $$('#btnLogin').addEventListener('click', doLogin);
  $$('#btnBalance').addEventListener('click', doBalance);
  $$('#btnTxns').addEventListener('click', doTxns);
  $$('#btnEarns').addEventListener('click', doEarns);
  $$('#btnDeposit').addEventListener('click', doDeposit);
  $$('#btnWithdraw').addEventListener('click', doWithdraw);
  $$('#btnEarn').addEventListener('click', doEarn);
}

// boot
initEnv();
initMobilePrefill();
bind();
doHealth().catch(()=>{});
