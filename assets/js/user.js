const userState = { user: null, finance: null, plans: [], recommendations: [], active: "dashboard", sort: { key: "", dir: 1 } };

const userNav = [
  ["dashboard", "Dashboard", "[]", "Overview of your salary, savings, plans, and analytics.", "dashboard.html"],
  ["profile", "Profile", "O", "Your user details and editable contact information.", "profile.html"],
  ["finances", "My Finances", "$", "Capture and update salary, expenses, savings, and net salary.", "my-finances.html"],
  ["calculator", "Investment Calculator", "%", "Get the best bank recommendation from stored investment criteria.", "investment-calculator.html"],
  ["plans", "My Plans", "=", "View, edit, delete, and inspect saved investment plans.", "my-plans.html"],
  ["report", "My Report", "#", "Printable financial profile, plans, banks, and risk summary.", "my-report.html"],
];

async function userBoot() {
  const me = await api("me");
  if (!me.user) return window.location.href = "index.html";
  if (me.user.role === "admin") return window.location.href = "admin-dashboard.html";
  userState.user = me.user;
  userState.finance = me.finance;
  await loadPlans();
  userState.active = document.body.dataset.page || "dashboard";
  if (!userState.finance && !["finances", "profile"].includes(userState.active)) {
    window.location.href = "my-finances.html";
    return;
  }
  bindLayout();
  renderUser();
}

async function loadPlans() {
  const payload = await api("plans");
  userState.plans = payload.plans || [];
}

function bindLayout() {
  $("#sidebar-user").textContent = `${userState.user.full_name} ${userState.user.surname}`;
  $("#top-user").textContent = initials(userState.user);
  $("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#logout-side").addEventListener("click", logout);
  $("#logout-top").addEventListener("click", logout);
}

function navigateUser(id) {
  if (!userState.finance && !["finances", "profile"].includes(id)) {
    showToast("Add financial data before using the rest of InvestSmart.", true);
    id = "finances";
  }
  const target = userNav.find(([navId]) => navId === id);
  window.location.href = target ? target[4] : "dashboard.html";
}

function renderUser() {
  const selected = userNav.find(([id]) => id === userState.active) || userNav[0];
  $("#page-title").textContent = selected[1];
  $("#page-description").textContent = selected[3];
  $("#nav-list").innerHTML = userNav.map(([id, label, icon]) => `<button class="nav-item ${id === userState.active ? "active" : ""}" data-nav="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("");
  document.querySelectorAll("[data-nav]").forEach((item) => item.addEventListener("click", () => navigateUser(item.dataset.nav)));
  ({ dashboard, profile, finances, calculator, plans, report })[userState.active]();
}

function cards(items) {
  return `<div class="cards">${items.map((item) => `<article class="card"><div class="label">${item.label}</div><div class="value">${item.value}</div></article>`).join("")}</div>`;
}

function dashboard() {
  const finance = userState.finance || {};
  $("#content").innerHTML = `
    ${cards([{ label: "Net Salary", value: money(finance.net_salary) }, { label: "Current Savings", value: money(finance.current_savings) }, { label: "Active Plans", value: userState.plans.length }, { label: "Age", value: userState.user.age || "N/A" }])}
    <div class="grid-2">
      <section class="panel"><h2>Financial Analytics</h2><div class="chart-box"><canvas id="finance-chart"></canvas></div></section>
      <section class="panel"><h2>Investment Distribution</h2><div class="chart-box"><canvas id="plans-bar-chart"></canvas></div></section>
    </div>
    <section class="panel" style="margin-top:18px"><h2>Quick Actions</h2><div class="quick-actions"><button class="secondary" data-jump="profile">Profile</button><button class="secondary" data-jump="calculator">Calculator</button><button class="secondary" data-jump="plans">My Plans</button></div></section>`;
  drawPie("finance-chart", [["Expenses", finance.monthly_expenses || 0, "#bf3b3b"], ["Savings", finance.current_savings || 0, "#0f8b8d"], ["Net Salary", finance.net_salary || 0, "#f2a541"]]);
  drawBar("plans-bar-chart", userState.plans.map((plan) => plan.user_plan_name), userState.plans.map((plan) => plan.investment_amount), "#f2a541");
  document.querySelectorAll("[data-jump]").forEach((btn) => btn.addEventListener("click", () => navigateUser(btn.dataset.jump)));
}

function profile() {
  $("#content").innerHTML = `<section class="panel"><form id="profile-form" class="form-grid two">
    <label>Full Name <input value="${escapeHtml(userState.user.full_name)}" disabled></label><label>Surname <input value="${escapeHtml(userState.user.surname)}" disabled></label>
    <label>ID Number <input value="${escapeHtml(userState.user.id_number)}" disabled></label><label>Age <input value="${escapeHtml(userState.user.age || "N/A")}" disabled></label>
    <label>Email <input name="email" type="email" value="${escapeHtml(userState.user.email)}" required></label><label>Contact Info <input name="contact_info" value="${escapeHtml(userState.user.contact_info || "")}"></label>
    <button class="primary" type="submit">Save Profile</button></form></section>`;
  $("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("profile", { method: "POST", body: formData(event.currentTarget) });
    showToast("Profile updated.");
    await userBoot();
  });
}

function finances() {
  const finance = userState.finance || {};
  $("#content").innerHTML = `<section class="panel"><form id="finance-form" class="form-grid two">
    <label>Gross Salary <input name="gross_salary" type="number" min="0" step="0.01" value="${finance.gross_salary || ""}" required></label>
    <label>Deductions <input name="deductions" type="number" min="0" step="0.01" value="${finance.deductions || ""}" required></label>
    <label>Monthly Expenses <input name="monthly_expenses" type="number" min="0" step="0.01" value="${finance.monthly_expenses || ""}" required></label>
    <label>Current Savings <input name="current_savings" type="number" min="0" step="0.01" value="${finance.current_savings || ""}" required></label>
    <label>Net Salary <input id="net-salary" value="${money(finance.net_salary)}" disabled></label><button class="primary" type="submit">Save Financial Data</button></form></section>`;
  const form = $("#finance-form");
  const updateNet = () => {
    const data = formData(form);
    $("#net-salary").value = money(Math.max(0, Number(data.gross_salary || 0) - Number(data.deductions || 0) - Number(data.monthly_expenses || 0)));
  };
  form.querySelectorAll("input[type='number']").forEach((input) => input.addEventListener("input", updateNet));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("finance", { method: "POST", body: formData(form) });
    showToast("Financial data saved.");
    await userBoot();
  });
}

function calculator() {
  $("#content").innerHTML = `<div class="grid-2"><section class="panel"><form id="calculator-form" class="form-grid">
    <label>Plan Name <input name="plan_name" required></label><label>Investment Amount <input name="investment_amount" type="number" min="0" step="0.01" required></label>
    <label>Time Horizon <select name="horizon"><option>Short</option><option>Medium</option><option>Long</option></select></label>
    <label>Risk Tolerance <select name="risk"><option>Low</option><option>Medium</option><option>High</option></select></label>
    <label>Liquidity Preference <select name="liquidity"><option value="High">Immediate</option><option value="Medium">Moderate</option><option value="Low">Low</option></select></label>
    <label>Income/Return Expectation <input name="return_expectation" placeholder="Optional"></label>
    <label>Monthly Contribution <select name="monthly_contribution"><option value="">No</option><option value="1">Yes</option></select></label>
    <label>Monthly Amount <input name="monthly_amount" type="number" min="0" step="0.01" value="0"></label>
    <label>Investment Goal <textarea name="investment_goal" required></textarea></label><button class="primary" type="submit">Calculate</button>
    </form></section><section class="panel"><h2>Recommended Bank</h2><div id="recommendations" class="recommendations"><p class="muted">Complete the calculator to see the best bank recommendation.</p></div></section></div>`;
  $("#calculator-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = formData(event.currentTarget);
    const payload = await api("recommend", { method: "POST", body: input });
    userState.recommendations = payload.recommendations || [];
    const item = userState.recommendations[0];
    if (!item) return $("#recommendations").innerHTML = `<p class="muted">No matching bank found.</p>`;
    $("#recommendations").innerHTML = `<article class="recommendation-card"><header><strong>${escapeHtml(item.bank_name)}</strong><span class="badge good">Score ${item.score}/5</span></header>
      <div class="metric-list"><div><span>Plan Name</span>${escapeHtml(item.user_plan_name)}</div><div><span>Expected Return</span>${item.expected_return}%</div><div><span>Risk Level</span>${escapeHtml(item.risk)}</div><div><span>Liquidity</span>${escapeHtml(item.liquidity)}</div><div><span>Suggested Horizon</span>${escapeHtml(item.horizon)}-term</div><div><span>Monthly Contribution</span>${item.allows_monthly ? "Yes" : "No"}</div></div>
      <p class="muted">${escapeHtml(item.bank_contact)}<br>${escapeHtml(item.bank_details || "")}</p><div class="actions"><button class="primary" id="save-rec">Save Plan</button><a class="secondary button-link" href="${escapeHtml(item.bank_website || "#")}" target="_blank" rel="noreferrer">Bank Website</a></div></article>`;
    $("#save-rec").addEventListener("click", async () => {
      await api("plans", { method: "POST", body: { bank_id: item.bank_id, user_plan_name: input.plan_name, investment_amount: input.investment_amount, monthly_contribution: Boolean(input.monthly_contribution), monthly_amount: input.monthly_amount || 0, investment_goal: input.investment_goal, risk: item.risk, liquidity: item.liquidity, horizon: item.horizon, expected_return: item.expected_return, score: item.score } });
      showToast("Plan saved to My Plans.");
      await loadPlans();
    });
  });
}

function plans() {
  $("#content").innerHTML = `<div class="section-head"><div></div><button class="primary" data-jump="calculator">Add Plan</button></div>${planTable(true)}`;
  wirePlans();
  $("[data-jump='calculator']").addEventListener("click", () => navigateUser("calculator"));
}

function planTable(editable) {
  return `<div class="table-wrap"><div class="table-tools"><input data-search-table placeholder="Search plan, bank, or risk"></div><table><thead><tr><th>Plan Name</th><th>Amount</th><th>Risk</th><th>Horizon</th><th>Liquidity</th><th>Monthly</th><th>Bank</th><th>Actions</th></tr></thead><tbody>${userState.plans.map((plan) => `<tr><td>${escapeHtml(plan.user_plan_name)}</td><td>${money(plan.investment_amount)}</td><td>${escapeHtml(plan.risk)}</td><td>${escapeHtml(plan.horizon)}-term</td><td>${escapeHtml(plan.liquidity)}</td><td>${Number(plan.monthly_contribution) ? `Yes (${money(plan.monthly_amount)})` : "No"}</td><td>${escapeHtml(plan.bank_name || "N/A")}<br><span class="muted">${escapeHtml(plan.bank_contact || "")}</span></td><td class="actions"><button class="secondary" data-view-plan="${plan.id}">View</button>${editable ? `<button class="secondary" data-edit-plan="${plan.id}">Edit</button><button class="danger" data-delete-plan="${plan.id}">Delete</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="8">No plans saved yet.</td></tr>`}</tbody></table></div>`;
}

function wirePlans() {
  const search = $("[data-search-table]");
  if (search) search.addEventListener("input", () => document.querySelectorAll("tbody tr").forEach((row) => row.classList.toggle("hidden", !row.textContent.toLowerCase().includes(search.value.toLowerCase()))));
  document.querySelectorAll("[data-view-plan]").forEach((btn) => btn.addEventListener("click", () => {
    const plan = userState.plans.find((item) => Number(item.id) === Number(btn.dataset.viewPlan));
    alert(`${plan.user_plan_name}\nBank: ${plan.bank_name}\nContact: ${plan.bank_contact}\nWebsite: ${plan.bank_website || ""}\nDetails: ${plan.bank_details || ""}`);
  }));
  document.querySelectorAll("[data-delete-plan]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Delete this plan?")) return;
    await api(`plan&id=${btn.dataset.deletePlan}`, { method: "DELETE" });
    await loadPlans();
    plans();
  }));
  document.querySelectorAll("[data-edit-plan]").forEach((btn) => btn.addEventListener("click", async () => {
    const plan = userState.plans.find((item) => Number(item.id) === Number(btn.dataset.editPlan));
    const name = prompt("Plan name", plan.user_plan_name);
    if (name === null) return;
    const amount = prompt("Investment amount", plan.investment_amount);
    if (amount === null) return;
    const goal = prompt("Investment goal", plan.investment_goal || "");
    if (goal === null) return;
    await api("plan", { method: "PUT", body: { id: plan.id, user_plan_name: name, investment_amount: amount, investment_goal: goal } });
    await loadPlans();
    plans();
  }));
}

function report() {
  const finance = userState.finance || {};
  $("#content").innerHTML = `<div class="section-head"><div></div><button class="primary" id="print-report">Print Report</button></div>
    ${cards([{ label: "User", value: `${escapeHtml(userState.user.full_name)} ${escapeHtml(userState.user.surname)}` }, { label: "Net Salary", value: money(finance.net_salary) }, { label: "Savings", value: money(finance.current_savings) }, { label: "Plans", value: userState.plans.length }])}
    <div class="grid-2"><section class="panel"><h2>Risk Summary</h2><div class="chart-box"><canvas id="risk-chart"></canvas></div></section><section class="panel"><h2>Financial Overview</h2><p>Gross salary: ${money(finance.gross_salary)}</p><p>Deductions: ${money(finance.deductions)}</p><p>Expenses: ${money(finance.monthly_expenses)}</p></section></div>
    <section class="panel" style="margin-top:18px"><h2>Recommended Investment Plans and Banks</h2>${planTable(false)}</section>`;
  const totals = userState.plans.reduce((acc, plan) => ({ ...acc, [plan.risk]: (acc[plan.risk] || 0) + 1 }), {});
  drawPie("risk-chart", Object.entries(totals).map(([risk, total]) => [risk, total, colorForRisk(risk)]));
  $("#print-report").addEventListener("click", () => window.print());
}

userBoot().catch((error) => showToast(error.message, true));
