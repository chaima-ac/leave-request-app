const API_BASE = "";

const loader = document.getElementById("loader");
function showLoader() { loader.classList.remove("hidden"); }
function hideLoader() { loader.classList.add("hidden"); }

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `msg show ${type}`;
}

async function doAdminLogin() {
  const password = document.getElementById("adminPassword").value;
  if (!password) { showMsg("adminMsg", "Please enter the admin password.", "error"); return; }

  showLoader();
  try {
    const res = await fetch(`${API_BASE}/admin-login`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Invalid password");

    localStorage.setItem("ld_admin_token", data.token);
    window.location.href = "admin.html";
  } catch (err) {
    showMsg("adminMsg", err.message, "error");
  }
  hideLoader();
}