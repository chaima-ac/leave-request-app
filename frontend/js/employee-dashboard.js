const API_BASE = "";

const token      = localStorage.getItem("ld_token");
const employeeId = localStorage.getItem("ld_employee_id");
const userName   = localStorage.getItem("ld_name");
const userEmail  = localStorage.getItem("ld_email");

if (!token || !employeeId) { window.location.href = "employee-auth.html"; }

const loader = document.getElementById("loader");
function showLoader() { loader.classList.remove("hidden"); }
function hideLoader() { loader.classList.add("hidden"); }

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `msg show ${type}`;
}

document.getElementById("welcomeMsg").textContent = `Welcome, ${userName || "Employee"}`;
document.getElementById("userEmail").textContent  = userEmail || "";

function switchTab(tab) {
  const isNew = tab === 'new';
  document.getElementById('newSection').style.display     = isNew ? 'block' : 'none';
  document.getElementById('historySection').style.display = isNew ? 'none'  : 'block';
  document.getElementById('tabNew').classList.toggle('active', isNew);
  document.getElementById('tabHistory').classList.toggle('active', !isNew);
  if (!isNew) loadMyRequests();
}

async function submitRequest(e) {
  e.preventDefault();
  const start_date = document.getElementById("start_date").value;
  const end_date   = document.getElementById("end_date").value;
  const leave_type = document.getElementById("leave_type").value;
  const comment    = document.getElementById("comment").value;

  if (!start_date || !end_date) { showMsg("formMsg","Please select start and end dates.","error"); return; }
  if (end_date < start_date)    { showMsg("formMsg","End date cannot be before start date.","error"); return; }

  showLoader();
  try {
    const res = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify({ employee_id: employeeId, employee_name: userName,
        employee_email: userEmail, start_date, end_date, leave_type, comment })
    });
    if (!res.ok) throw new Error("Submission failed");
    showMsg("formMsg", "Request submitted successfully!", "success");
    document.getElementById("leaveForm").reset();
    setTimeout(() => switchTab('history'), 1200);
  } catch (err) {
    showMsg("formMsg", err.message, "error");
  }
  hideLoader();
}

async function loadMyRequests() {
  const container = document.getElementById("requestsContainer");
  container.innerHTML = `<div class="empty-state"><span class="empty-icon">⏳</span><p>Loading...</p></div>`;
  try {
    const res = await fetch(`${API_BASE}/my-requests?employee_id=${employeeId}`, {
      headers: { "Authorization": token }
    });
    const requests = await res.json();

    if (!requests.length) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>No requests yet. Submit your first one!</p></div>`;
      return;
    }

    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    container.innerHTML = requests.map(req => `
      <div class="req-card">
        <div class="req-left">
          <div class="req-name">${req.leave_type}</div>
          <div class="req-meta">📅 ${req.start_date} → ${req.end_date}</div>
          <div class="req-meta">🕐 Submitted ${formatDate(req.created_at)}</div>
          ${req.comment ? `<div class="req-comment">"${escapeHtml(req.comment)}"</div>` : ''}
        </div>
        <div class="req-right">
          <span class="badge badge-${req.status.toLowerCase()}">${req.status}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Failed to load requests</p></div>`;
  }
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function logout() {
  ["ld_token","ld_email","ld_name","ld_employee_id"].forEach(k => localStorage.removeItem(k));
  window.location.href = "index.html";
}