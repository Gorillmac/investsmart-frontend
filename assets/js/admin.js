const adminState = { user: null, active: "admin-dashboard", banks: [] };
const adminNav = [
  ["admin-dashboard", "Admin Dashboard", "[]", "System-wide investment and user metrics.", "admin-dashboard.html"],
  ["admin-users", "Manage Users", "O", "Search, view, edit, activate, deactivate, and reset users.", "admin-users.html"],
  ["admin-banks", "Manage Providers", "$", "Add, edit, and remove banks with investment criteria.", "admin-providers.html"],
  ["admin-reports", "Reports", "#", "System-wide segmented reports and charts.", "admin-reports.html"],
];

async function adminBoot() {
  const me = await api("me");
  if (!me.user) return window.location.href = "index.html";
  if (me.user.role !== "admin") return window.location.href = "dashboard.html";
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
  const report = await api("admin-report");
  $("#content").innerHTML = `${cards([{ label: "Total Users", value: report.metrics.total_users }, { label: "Total Savings", value: money(report.metrics.total_savings) }, { label: "Total Plans", value: report.metrics.total_plans }, { label: "Average Plan", value: money(report.metrics.average_plan_amount) }])}
    <div class="grid-2"><section class="panel"><h2>Risk Distribution</h2><div class="chart-box"><canvas id="admin-risk-chart"></canvas></div></section><section class="panel"><h2>Popular Banks</h2><div class="chart-box"><canvas id="admin-bank-chart"></canvas></div></section></div>
    <section class="panel" style="margin-top:18px"><h2>Quick Links</h2><div class="quick-actions"><button class="secondary" data-jump="admin-users">Users</button><button class="secondary" data-jump="admin-banks">Banks</button><button class="secondary" data-jump="admin-reports">Reports</button></div></section>`;
  drawPie("admin-risk-chart", report.risk.map((row) => [row.risk, row.total, colorForRisk(row.risk)]));
  drawBar("admin-bank-chart", report.banks.map((row) => row.label || "Unknown"), report.banks.map((row) => row.total), "#0f8b8d");
  document.querySelectorAll("[data-jump]").forEach((btn) => btn.addEventListener("click", () => navigateAdmin(btn.dataset.jump)));
}

async function adminUsers() {
  const payload = await api("admin-users");
  $("#content").innerHTML = `<div class="table-wrap"><div class="table-tools"><input data-search-table placeholder="Search name, email, or ID"></div><table><thead><tr><th>Full Name</th><th>Email</th><th>ID</th><th>Age</th><th>Status</th><th>Actions</th></tr></thead><tbody>${payload.users.map((user) => `<tr><td>${escapeHtml(user.full_name)} ${escapeHtml(user.surname)}</td><td>${escapeHtml(user.email)}</td><td>${escapeHtml(user.id_number)}</td><td>${user.age || "N/A"}</td><td>${escapeHtml(user.status)}</td><td class="actions"><button class="secondary" data-view-user="${user.id}">View</button><button class="secondary" data-edit-user="${user.id}">Edit</button><button class="secondary" data-toggle-user="${user.id}" data-status="${user.status === "active" ? "inactive" : "active"}">${user.status === "active" ? "Deactivate" : "Activate"}</button><button class="secondary" data-reset-user="${user.id}">Reset Password</button><button class="danger" data-delete-user="${user.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>`;
  wireSearch();
  document.querySelectorAll("[data-view-user]").forEach((btn) => btn.addEventListener("click", () => {
    const user = payload.users.find((item) => Number(item.id) === Number(btn.dataset.viewUser));
    alert(`${user.full_name} ${user.surname}\n${user.email}\nID: ${user.id_number}\nAge: ${user.age || "N/A"}`);
  }));
  document.querySelectorAll("[data-edit-user]").forEach((btn) => btn.addEventListener("click", async () => {
    const user = payload.users.find((item) => Number(item.id) === Number(btn.dataset.editUser));
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
  adminState.banks = payload.banks || [];
  $("#content").innerHTML = `<div class="grid-2"><section class="panel"><h2>Add Bank</h2>${bankForm()}</section><section class="table-wrap"><div class="table-tools"><input data-search-table placeholder="Search banks"></div><table><thead><tr><th>Bank</th><th>Plan Type</th><th>Return</th><th>Risk</th><th>Liquidity</th><th>Actions</th></tr></thead><tbody>${adminState.banks.map((bank) => `<tr><td>${escapeHtml(bank.name)}<br><span class="muted">${escapeHtml(bank.contact_info)}</span></td><td>${escapeHtml(bank.plan_type)}</td><td>${bank.expected_return}%</td><td>${escapeHtml(bank.risk)}</td><td>${escapeHtml(bank.liquidity)}</td><td class="actions"><button class="secondary" data-edit-bank="${bank.id}">Edit</button><button class="danger" data-remove-bank="${bank.id}">Remove</button></td></tr>`).join("")}</tbody></table></section></div>`;
  wireSearch();
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
  const report = await api("admin-report");
  $("#content").innerHTML = `<div class="section-head"><div></div><button class="primary" id="download-admin-pdf">Download PDF</button><button class="secondary" id="print-admin-report">Print Report</button></div>${cards([{ label: "Total Users", value: report.metrics.total_users }, { label: "Total Savings", value: money(report.metrics.total_savings) }, { label: "Total Plans", value: report.metrics.total_plans }, { label: "Average Plan", value: money(report.metrics.average_plan_amount) }])}
  <div class="grid-2"><section class="panel"><h2>System Risk Distribution</h2><div class="chart-box"><canvas id="system-risk-chart"></canvas></div></section><section class="panel"><h2>Age Group Distribution</h2><div class="chart-box"><canvas id="age-group-chart"></canvas></div></section></div>
  <div class="grid-2"><section class="panel"><h2>Plan Type Analytics</h2><div class="chart-box"><canvas id="plan-type-chart"></canvas></div></section><section class="panel"><h2>Bank Analytics</h2><div class="chart-box"><canvas id="bank-analytics-chart"></canvas></div></section></div>`;
  drawPie("system-risk-chart", report.risk.map((row) => [row.risk, row.total, colorForRisk(row.risk)]));
  drawBar("age-group-chart", report.age_groups.map((row) => row.label), report.age_groups.map((row) => row.total), "#f2a541");
  drawBar("plan-type-chart", report.plan_types.map((row) => row.label || "Unknown"), report.plan_types.map((row) => row.total), "#0f8b8d");
  drawBar("bank-analytics-chart", report.banks.map((row) => row.label || "Unknown"), report.banks.map((row) => row.total), "#18212f");
  $("#print-admin-report").addEventListener("click", () => window.print());
  $("#download-admin-pdf").addEventListener("click", () => downloadAdminPdf(report));
}

function wireSearch() {
  const search = $("[data-search-table]");
  if (!search) return;
  search.addEventListener("input", () => document.querySelectorAll("tbody tr").forEach((row) => row.classList.toggle("hidden", !row.textContent.toLowerCase().includes(search.value.toLowerCase()))));
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
  doc.text("Top banks:", 14, 70);
  report.banks.slice(0, 5).forEach((row, index) => doc.text(`${row.label || "Unknown"} - ${row.total}`, 20, 78 + (index * 8)));
  doc.text("Risk distribution:", 110, 70);
  report.risk.forEach((row, index) => doc.text(`${row.risk} - ${row.total}`, 116, 78 + (index * 8)));
  doc.save("investsmart-admin-report.pdf");
}

adminBoot().catch((error) => showToast(error.message, true));
