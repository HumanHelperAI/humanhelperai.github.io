const API_BASE = "https://api.humanhelperai.in";
let TOKEN = "";
const H = (id) => document.getElementById(id);
const J = (obj) => JSON.stringify(obj, null, 2);

async function api(path, {method="GET", body=null, auth=false} = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && TOKEN) headers["Authorization"] = `Bearer ${TOKEN}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
    cache: "no-cache",
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, text }; }
}

// Health
H("btnHealth").onclick = async () => {
  const out = H("healthOut");
  const r = await api("/health");
  out.innerHTML = `<pre>${J(r.json || r.text)}</pre>`;
};

// Login
H("btnLogin").onclick = async () => {
  const m = H("mobile").value.trim();
  if (!m) return H("authOut").innerHTML = `<span class="err">Enter mobile</span>`;
  const r = await api("/login", { method: "POST", body: { mobile: m }});
  if (r.json && r.json.token) {
    TOKEN = r.json.token;
    H("authOut").innerHTML = `<span class="ok">Token set ✔</span>`;
    localStorage.setItem("hh_token", TOKEN);
    localStorage.setItem("hh_mobile", m);
  } else {
    H("authOut").innerHTML = `<pre class="err">${J(r.json || r.text)}</pre>`;
  }
};

// Helpers
function mob() { return (H("mobile").value.trim() || localStorage.getItem("hh_mobile") || ""); }
function ensureMob(outEl) {
  const m = mob();
  if (!m) { outEl.innerHTML = `<span class="err">Login first</span>`; return null; }
  return m;
}

// Balance
H("btnBalance").onclick = async () => {
  const out = H("walletOut");
  const m = ensureMob(out); if (!m) return;
  const r = await api(`/balance/${m}`);
  out.textContent = J(r.json || r.text);
};

// Transactions
H("btnTxns").onclick = async () => {
  const out = H("walletOut");
  const m = ensureMob(out); if (!m) return;
  const r = await api(`/transactions/${m}`);
  out.textContent = J(r.json || r.text);
};

// Earnings
H("btnEarnings").onclick = async () => {
  const out = H("walletOut");
  const m = ensureMob(out); if (!m) return;
  const r = await api(`/earnings/${m}`, { auth: true });
  out.textContent = J(r.json || r.text);
};

// Deposit (test)
H("btnDeposit").onclick = async () => {
  const out = H("walletOut");
  const m = ensureMob(out); if (!m) return;
  const amt = parseFloat(H("depAmt").value || "0");
  const r = await api("/deposit", { method: "POST", body: { mobile: m, amount: amt }});
  out.textContent = J(r.json || r.text);
};

// Withdraw
H("btnWithdraw").onclick = async () => {
  const out = H("walletOut");
  const m = ensureMob(out); if (!m) return;
  const amt = parseFloat(H("wdAmt").value || "0");
  const provider = H("wdProv").value;
  const r = await api("/withdraw", { method: "POST", body: { mobile: m, amount: amt, provider }});
  out.textContent = J(r.json || r.text);
};

// Earn demo
H("btnEarn").onclick = async () => {
  const out = H("walletOut");
  const m = ensureMob(out); if (!m) return;
  const vid = (H("vidId").value || `video-${Date.now()}`);
  const ctype = H("ctype").value;
  const dur = parseInt(H("dur").value || "0", 10);
  const r = await api("/earn", { method: "POST",
    body: { mobile: m, video_id: vid, content_type: ctype, duration: dur }
  });
  out.textContent = J(r.json || r.text);
};

// Restore token if present
(function bootstrap() {
  const t = localStorage.getItem("hh_token");
  const m = localStorage.getItem("hh_mobile");
  if (t) TOKEN = t;
  if (m && !H("mobile").value) H("mobile").value = m;
})();
