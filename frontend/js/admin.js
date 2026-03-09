const API_BASE = "https://1btpbwnf8c.execute-api.us-east-1.amazonaws.com/dev";

const adminToken = localStorage.getItem("ld_admin_token");
if (!adminToken) { window.location.href = "admin-auth.html"; }

const loader = document.getElementById("loader");
function showLoader() { loader.classList.remove("hidden"); }
function hideLoader() { loader.classList.add("hidden"); }

let allRequests = [];

async function loadRequests() {
  showLoader();
  try {
    const res = await fetch(`${API_BASE}/requests`, {
      headers: { "Authorization": adminToken }
    });
    if (res.status === 401) { logout(); return; }
    allRequests = await res.json();
    allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    displayRequests(allRequests);
  } catch (err) {
    document.getElementById("requestsContainer").innerHTML =
      `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Failed to load requests</p></div>`;
  }
  hideLoader();
}

function displayRequests(requests) {
  const container = document.getElementById("requestsContainer");

  let total = requests.length, pending = 0, approved = 0, rejected = 0;
  requests.forEach(r => {
    if (r.status === "Pending")  pending++;
    if (r.status === "Approved") approved++;
    if (r.status === "Rejected") rejected++;
  });

  document.getElementById("totalRequests").textContent    = total;
  document.getElementById("pendingRequests").textContent  = pending;
  document.getElementById("approvedRequests").textContent = approved;
  document.getElementById("rejectedRequests").textContent = rejected;

  if (!requests.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🎉</span><p>No requests found</p></div>`;
    return;
  }

  container.innerHTML = requests.map(req => `
    <div class="req-card">
      <div class="req-left">
        <div class="req-name">${escapeHtml(req.employee_name || "Unknown")}</div>
        <div class="req-meta">✉️ ${escapeHtml(req.employee_email || "—")}</div>
        <div class="req-meta">📅 ${req.start_date} → ${req.end_date} &nbsp;·&nbsp; ${req.leave_type}</div>
        <div class="req-meta">🕐 Submitted ${formatDate(req.created_at)}</div>
        ${req.comment ? `<div class="req-comment">"${escapeHtml(req.comment)}"</div>` : ''}
      </div>
      <div class="req-right">
        <span class="badge badge-${req.status.toLowerCase()}">${req.status}</span>
        ${req.status === "Pending" ? `
          <div class="req-actions">
            <button class="btn-approve" onclick="updateStatus('${req.request_id}','Approved')">✓ Approve</button>
            <button class="btn-reject"  onclick="updateStatus('${req.request_id}','Rejected')">✕ Reject</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function updateStatus(id, status) {
  showLoader();
  try {
    const res = await fetch(`${API_BASE}/request-status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": adminToken },
      body: JSON.stringify({ request_id: id, status })
    });
    if (!res.ok) throw new Error("Update failed");
    await loadRequests();
  } catch (err) {
    alert("Error updating request status");
  }
  hideLoader();
}

function applyFilters() {
  const status = document.getElementById("statusFilter").value;
  const search = document.getElementById("searchInput").value.toLowerCase();
  let filtered = allRequests;
  if (status !== "All") filtered = filtered.filter(r => r.status === status);
  if (search) filtered = filtered.filter(r =>
    (r.employee_name  || "").toLowerCase().includes(search) ||
    (r.employee_email || "").toLowerCase().includes(search)
  );
  displayRequests(filtered);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function logout() {
  localStorage.removeItem("ld_admin_token");
  window.location.href = "index.html";
}

window.addEventListener("load", loadRequests);
document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") applyFilters();
});