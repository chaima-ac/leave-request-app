const API_BASE = "";

const loader = document.getElementById("loader");
function showLoader() { loader.classList.remove("hidden"); }
function hideLoader() { loader.classList.add("hidden"); }

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `msg show ${type}`;
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginSection').style.display = isLogin ? 'block' : 'none';
  document.getElementById('registerSection').style.display = isLogin ? 'none' : 'block';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
}

async function doLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) { showMsg("loginMsg", "Please fill in all fields.", "error"); return; }

  showLoader();
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Login failed");

    // Store session info
    localStorage.setItem("ld_token", data.token);
    localStorage.setItem("ld_email", data.email);
    localStorage.setItem("ld_name", data.name);
    localStorage.setItem("ld_employee_id", data.employee_id);

    window.location.href = "employee.html";
  } catch (err) {
    showMsg("loginMsg", err.message, "error");
  }
  hideLoader();
}

async function doRegister() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirm").value;

  if (!name || !email || !password) { showMsg("registerMsg", "Please fill in all fields.", "error"); return; }
  if (password.length < 6) { showMsg("registerMsg", "Password must be at least 6 characters.", "error"); return; }
  if (password !== confirm) { showMsg("registerMsg", "Passwords do not match.", "error"); return; }

  showLoader();
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Registration failed");

    showMsg("registerMsg", "Account created! Signing you in...", "success");

    // Auto login
    localStorage.setItem("ld_token", data.token);
    localStorage.setItem("ld_email", data.email);
    localStorage.setItem("ld_name", data.name);
    localStorage.setItem("ld_employee_id", data.employee_id);

    setTimeout(() => window.location.href = "employee.html", 800);
  } catch (err) {
    showMsg("registerMsg", err.message, "error");
  }
  hideLoader();
}

// Allow Enter key on login
document.getElementById("loginPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") doLogin();
});