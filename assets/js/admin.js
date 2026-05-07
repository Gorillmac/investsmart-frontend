const adminState = { user: null, active: "admin-dashboard", banks: [], sorts: { users: { key: "full_name", dir: 1 }, banks: { key: "name", dir: 1 } } };
const adminNav = [
  ["admin-dashboard", "Admin Dashboard", "[]", "System-wide investment and user metrics.", "admin-dashboard.html"],
  ["admin-users", "Manage Users", "O", "Search, view, edit, activate, deactivate, and reset users.", "admin-users.html"],
  ["admin-banks", "Manage Providers", "$", "Add, edit, and remove banks with investment criteria.", "admin-providers.html"],
  ["admin-reports", "Reports", "#", "System-wide segmented reports and charts.", "admin-reports.html"],
];

async function adminBoot() {
  const me = await api("me");
  if (!me.user) return window.location.href = "index.html";
  if (me.user.role !== "admin") return window.location.href = "unauthorized.html";
  adminState.user = me.user;
  adminState.active = document.body.dataset.page || "admin-dashboard";
  $("#sidebar-user").textContent = `${me.user.full_name} ${me.user.surname}`;
  $("#top-user").textContent = initials(me.user);
  $("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#logout-side").addEventListener("click", logout);
  $("#logout-top").addEventListener("click", logout);
  renderAdmin();
}

function navigateAdmin(id) {
  const target = adminNav.find(([navId]) => navId === id);
  window.location.href = target ? target[4] : "admin-dashboard.html";
}

function renderAdmin() {
  const selected = adminNav.find(([id]) => id === adminState.active) || adminNav[0];
  $("#page-title").textContent = selected[1];
  $("#page-description").textContent = selected[3];
  $("#nav-list").innerHTML = adminNav.map(([id, label, icon]) => `<button class="nav-item ${id === adminState.active ? "active" : ""}" data-nav="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("");
  document.querySelectorAll("[data-nav]").forEach((item) => item.addEventListener("click", () => navigateAdmin(item.dataset.nav)));
  ({ "admin-dashboard": adminDashboard, "admin-users": adminUsers, "admin-banks": adminBanks, "admin-reports": adminReports })[adminState.active]();
}

function cards(items) {
  return `<div class="cards">${items.map((item) => `<article class="card"><div class="label">${item.label}</div><div class="value">${item.value}</div></article>`).join("")}</div>`;
}

async function adminDashboard() {
  const [report, activity] = await Promise.all([api("admin-report"), api("admin-activity")]);
  $("#content").innerHTML = `${cards([{ label: "Total Users", value: report.metrics.total_users }, { label: "Total Savings", value: money(report.metrics.total_savings) }, { label: "Total Plans", value: report.metrics.total_plans }, { label: "Average Plan", value: money(report.metrics.average_plan_amount) }, { label: "Average Age", value: report.metrics.average_user_age || "N/A" }, { label: "Projected Portfolio", value: money(report.metrics.projected_portfolio_total) }, { label: "Top Bank", value: report.metrics.top_bank }, { label: "Most Common Risk", value: report.metrics.dominant_risk }])}
    <div class="grid-2"><section class="panel"><h2>Risk Distribution</h2><div class="chart-box"><canvas id="admin-risk-chart"></canvas></div></section><section class="panel"><h2>Popular Banks</h2><div class="chart-box"><canvas id="admin-bank-chart"></canvas></div></section></div>
    <section class="panel" style="margin-top:18px"><h2>Quick Links</h2><div class="quick-actions"><button class="secondary" data-jump="admin-users">Users</button><button class="secondary" data-jump="admin-banks">Banks</button><button class="secondary" data-jump="admin-reports">Reports</button></div></section>
    <section class="panel" style="margin-top:18px"><h2>Recent Activity</h2>${activityPanel(activity.activities)}</section>`;
  drawPie("admin-risk-chart", report.risk.map((row) => [row.risk, row.total, colorForRisk(row.risk)]));
  drawBar("admin-bank-chart", report.banks.map((row) => row.label || "Unknown"), report.banks.map((row) => row.total), "#0f8b8d");
  document.querySelectorAll("[data-jump]").forEach((btn) => btn.addEventListener("click", () => navigateAdmin(btn.dataset.jump)));
}

async function adminUsers() {
  const payload = await api("admin-users");
  const users = sortRows(payload.users, adminState.sorts.users);
  $("#content").innerHTML = `<div class="table-wrap"><div class="table-tools"><input data-search-table placeholder="Search name, email, or ID"><div class="inline-actions"><button class="secondary" id="export-users">Export Users CSV</button></div></div><table><thead><tr><th>${sortHeader("users", "full_name", "Full Name")}</th><th>${sortHeader("users", "email", "Email")}</th><th>${sortHeader("users", "id_number", "ID")}</th><th>${sortHeader("users", "age", "Age")}</th><th>${sortHeader("users", "status", "Status")}</th><th>Actions</th></tr></thead><tbody>${users.map((user) => `<tr><td>${escapeHtml(user.full_name)} ${escapeHtml(user.surname)}</td><td>${escapeHtml(user.email)}</td><td>${escapeHtml(user.id_number)}</td><td>${user.age || "N/A"}</td><td><span class="status-badge ${user.status === "active" ? "status-active" : "status-inactive"}">${escapeHtml(user.status)}</span></td><td class="actions"><button class="secondary" data-view-user="${user.id}">View</button><button class="secondary" data-edit-user="${user.id}">Edit</button><button class="secondary" data-toggle-user="${user.id}" data-status="${user.status === "active" ? "inactive" : "active"}">${user.status === "active" ? "Deactivate" : "Activate"}</button><button class="secondary" data-reset-user="${user.id}">Reset Password</button><button class="danger" data-delete-user="${user.id}">Delete</button></td></tr>`).join("") || `<tr><td colspan="6" class="table-empty">No users found.</td></tr>`}</tbody></table></div>`;
  wireSearch();
  wireSort("users", adminUsers);
  $("#export-users").addEventListener("click", () => exportCsv("users"));
  document.querySelectorAll("[data-view-user]").forEach((btn) => btn.addEventListener("click", () => {
    const user = users.find((item) => Number(item.id) === Number(btn.dataset.viewUser));
    alert(`${user.full_name} ${user.surname}\n${user.email}\nID: ${user.id_number}\nAge: ${user.age || "N/A"}`);
  }));
  document.querySelectorAll("[data-edit-user]").forEach((btn) => btn.addEventListener("click", async () => {
    const user = users.find((item) => Number(item.id) === Number(btn.dataset.editUser));
    const fullName = prompt("Full name", user.full_name);
    if (fullName === null) return;
    const surname = prompt("Surname", user.surname);
    if (surname === null) return;
    const email = prompt("Email", user.email);
    if (email === null) return;
    await api("admin-user-update", { method: "POST", body: { id: user.id, full_name: fullName, surname, email, contact_info: user.contact_info || "" } });
    adminUsers();
  }));
  document.querySelectorAll("[data-toggle-user]").forEach((btn) => btn.addEventListener("click", async () => {
    await api("admin-user-status", { method: "POST", body: { id: btn.dataset.toggleUser, status: btn.dataset.status } });
    adminUsers();
  }));
  document.querySelectorAll("[data-reset-user]").forEach((btn) => btn.addEventListener("click", async () => {
    const payload = await api("admin-reset-password", { method: "POST", body: { id: btn.dataset.resetUser } });
    alert(`Temporary password: ${payload.temporary_password}`);
  }));
  document.querySelectorAll("[data-delete-user]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Delete this user and their plans?")) return;
    await api(`admin-user-delete&id=${btn.dataset.deleteUser}`, { method: "DELETE" });
    adminUsers();
  }));
}

async function adminBanks() {
  const payload = await api("banks");
  adminState.banks = sortRows(payload.banks || [], adminState.sorts.banks);
  $("#content").innerHTML = `<div class="grid-2"><section class="panel"><h2>Add Bank</h2>${bankForm()}</section><section class="table-wrap"><div class="table-tools"><input data-search-table placeholder="Search banks"><div class="inline-actions"><button class="secondary" id="export-banks">Export Banks CSV</button></div></div><table><thead><tr><th>${sortHeader("banks", "name", "Bank")}</th><th>${sortHeader("banks", "plan_type", "Plan Type")}</th><th>${sortHeader("banks", "expected_return", "Return")}</th><th>${sortHeader("banks", "risk", "Risk")}</th><th>${sortHeader("banks", "liquidity", "Liquidity")}</th><th>Actions</th></tr></thead><tbody>${adminState.banks.map((bank) => `<tr><td>${escapeHtml(bank.name)}<br><span class="muted">${escapeHtml(bank.contact_info)}</span></td><td>${escapeHtml(bank.plan_type)}</td><td>${bank.expected_return}%</td><td><span class="pill risk-${String(bank.risk).toLowerCase()}">${escapeHtml(bank.risk)}</span></td><td><span class="pill liquidity-${String(bank.liquidity).toLowerCase()}">${escapeHtml(bank.liquidity)}</span></td><td class="actions"><button class="secondary" data-edit-bank="${bank.id}">Edit</button><button class="danger" data-remove-bank="${bank.id}">Remove</button></td></tr>`).join("") || `<tr><td colspan="6" class="table-empty">No banks found.</td></tr>`}</tbody></table></section></div>`;
  wireSearch();
  wireSort("banks", adminBanks);
  $("#export-banks").addEventListener("click", () => exportCsv("banks"));
  $("#bank-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    data.allows_monthly = Boolean(data.allows_monthly);
    await api("bank", { method: "POST", body: data });
    adminBanks();
  });
  document.querySelectorAll("[data-edit-bank]").forEach((btn) => btn.addEventListener("click", async () => {
    const bank = adminState.banks.find((item) => Number(item.id) === Number(btn.dataset.editBank));
    const name = prompt("Bank name", bank.name);
    if (name === null) return;
    const contact = prompt("Contact info", bank.contact_info);
    if (contact === null) return;
    await api("bank", { method: "PUT", body: { ...bank, name, contact_info: contact, allows_monthly: Number(bank.allows_monthly) === 1 } });
    adminBanks();
  }));
  document.querySelectorAll("[data-remove-bank]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Remove this bank?")) return;
    await api(`bank&id=${btn.dataset.removeBank}`, { method: "DELETE" });
    adminBanks();
  }));
}

function bankForm() {
  return `<form id="bank-form" class="form-grid"><label>Bank Name <input name="name" required></label><label>Contact Info <input name="contact_info" required></label><label>Website Link <input name="website"></label><label>Investment Type <select name="plan_type"><option>Fixed Plan</option><option>Flexi Plan</option><option>Growth Plan</option><option>Equity Plan</option><option>Retirement/Income Plan</option></select></label><label>Expected Return % <input name="expected_return" type="number" min="0" step="0.01" required></label><label>Risk <select name="risk"><option>Low</option><option>Medium</option><option>High</option></select></label><label>Liquidity <select name="liquidity"><option>High</option><option>Medium</option><option>Low</option></select></label><label>Horizon <select name="horizon"><option>Short</option><option>Medium</option><option>Long</option></select></label><label><input name="allows_monthly" type="checkbox" value="1"> Allows monthly contributions</label><label>Bank Investment Details <textarea name="details"></textarea></label><button class="primary" type="submit">Add New Bank</button></form>`;
}

async function adminReports() {
  const [report, activity] = await Promise.all([api("admin-report"), api("admin-activity")]);
  $("#content").innerHTML = `<div class="section-head"><div></div><button class="primary" id="download-admin-pdf">Download PDF</button><button class="secondary" id="print-admin-report">Print Report</button></div>${cards([{ label: "Total Users", value: report.metrics.total_users }, { label: "Total Savings", value: money(report.metrics.total_savings) }, { label: "Total Plans", value: report.metrics.total_plans }, { label: "Average Plan", value: money(report.metrics.average_plan_amount) }, { label: "Projected Portfolio", value: money(report.metrics.projected_portfolio_total) }, { label: "Top Bank", value: report.metrics.top_bank }])}
  <section class="panel" style="margin-bottom:18px"><h2>Exports</h2><div class="inline-actions"><button class="secondary" id="export-report-users">Users CSV</button><button class="secondary" id="export-report-banks">Banks CSV</button><button class="secondary" id="export-report-plans">Plans CSV</button><button class="secondary" id="export-report-activity">Activity CSV</button></div></section>
  <div class="grid-2"><section class="panel"><h2>System Risk Distribution</h2><div class="chart-box"><canvas id="system-risk-chart"></canvas></div></section><section class="panel"><h2>Age Group Distribution</h2><div class="chart-box"><canvas id="age-group-chart"></canvas></div></section></div>
  <div class="grid-2"><section class="panel"><h2>Plan Type Analytics</h2><div class="chart-box"><canvas id="plan-type-chart"></canvas></div></section><section class="panel"><h2>Bank Analytics</h2><div class="chart-box"><canvas id="bank-analytics-chart"></canvas></div></section></div>
  <section class="panel" style="margin-top:18px"><h2>Recent Activity</h2>${activityPanel(activity.activities)}</section>`;
  drawPie("system-risk-chart", report.risk.map((row) => [row.risk, row.total, colorForRisk(row.risk)]));
  drawBar("age-group-chart", report.age_groups.map((row) => row.label), report.age_groups.map((row) => row.total), "#f2a541");
  drawBar("plan-type-chart", report.plan_types.map((row) => row.label || "Unknown"), report.plan_types.map((row) => row.total), "#0f8b8d");
  drawBar("bank-analytics-chart", report.banks.map((row) => row.label || "Unknown"), report.banks.map((row) => row.total), "#18212f");
  $("#print-admin-report").addEventListener("click", () => window.print());
  $("#download-admin-pdf").addEventListener("click", () => downloadAdminPdf(report));
  $("#export-report-users").addEventListener("click", () => exportCsv("users"));
  $("#export-report-banks").addEventListener("click", () => exportCsv("banks"));
  $("#export-report-plans").addEventListener("click", () => exportCsv("plans"));
  $("#export-report-activity").addEventListener("click", () => exportCsv("activity"));
}

function wireSearch() {
  const search = $("[data-search-table]");
  if (!search) return;
  search.addEventListener("input", () => document.querySelectorAll("tbody tr").forEach((row) => row.classList.toggle("hidden", !row.textContent.toLowerCase().includes(search.value.toLowerCase()))));
}

function activityPanel(items) {
  if (!items?.length) {
    return `<p class="table-empty">No activity recorded yet.</p>`;
  }

  return `<div class="activity-list">${items.map((item) => `<article class="activity-item"><div><strong>${escapeHtml(item.action.replaceAll("_", " "))}</strong><div class="activity-meta">${escapeHtml(item.description || item.entity_type)}</div></div><div class="activity-meta">${escapeHtml(`${item.full_name || ""} ${item.surname || ""}`.trim() || "System")}<br>${escapeHtml(item.created_at)}</div></article>`).join("")}</div>`;
}

function sortHeader(scope, key, label) {
  const current = adminState.sorts[scope];
  const arrow = current.key === key ? (current.dir === 1 ? "↑" : "↓") : "↕";
  return `<button class="sort-btn" data-sort-scope="${scope}" data-sort-key="${key}">${label}<span class="sort-arrow">${arrow}</span></button>`;
}

function sortRows(rows, sort) {
  return [...rows].sort((left, right) => {
    const a = String(left?.[sort.key] ?? "");
    const b = String(right?.[sort.key] ?? "");
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }) * sort.dir;
  });
}

function wireSort(scope, rerender) {
  document.querySelectorAll(`[data-sort-scope="${scope}"]`).forEach((button) => button.addEventListener("click", () => {
    const sort = adminState.sorts[scope];
    const key = button.dataset.sortKey;
    adminState.sorts[scope] = { key, dir: sort.key === key ? sort.dir * -1 : 1 };
    rerender();
  }));
}

async function exportCsv(type) {
  const payload = await api(`admin-export&type=${type}`);
  const rows = payload.rows || [];
  if (!rows.length) {
    showToast("No data available to export.", true);
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")].concat(rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll("\"", "\"\"")}"`).join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `investsmart-${type}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadAdminPdf(report) {
  if (!window.jspdf) {
    window.print();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("InvestSmart Admin Report", 14, 18);
  doc.setFontSize(11);
  doc.text(`Total users: ${report.metrics.total_users}`, 14, 32);
  doc.text(`Total savings: ${money(report.metrics.total_savings)}`, 14, 40);
  doc.text(`Total plans: ${report.metrics.total_plans}`, 14, 48);
  doc.text(`Average plan amount: ${money(report.metrics.average_plan_amount)}`, 14, 56);
  doc.text(`Projected portfolio: ${money(report.metrics.projected_portfolio_total)}`, 14, 64);
  doc.text(`Top bank: ${report.metrics.top_bank}`, 14, 72);
  doc.text(`Most common risk: ${report.metrics.dominant_risk}`, 14, 80);
  doc.text("Top banks:", 14, 96);
  report.banks.slice(0, 5).forEach((row, index) => doc.text(`${row.label || "Unknown"} - ${row.total}`, 20, 104 + (index * 8)));
  doc.text("Risk distribution:", 110, 96);
  report.risk.forEach((row, index) => doc.text(`${row.risk} - ${row.total}`, 116, 104 + (index * 8)));
  doc.save("investsmart-admin-report.pdf");
}

adminBoot().catch((error) => showToast(error.message, true));
