const apiBase = localStorage.getItem("investsmart_api_base") || window.INVESTSMART_API_BASE || "../backend/api/index.php";
const authTokenKey = "investsmart_auth_token";

const $ = (selector) => document.querySelector(selector);
const money = (value) => `R ${Number(value || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

async function api(action, options = {}) {
  const headers = { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" };
  const token = localStorage.getItem(authTokenKey);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Auth-Token"] = token;
  }
  const response = await fetch(`${apiBase}?action=${action}`, {
    method: options.method || "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function showToast(message, isError = false) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = isError ? "var(--danger)" : "var(--ink)";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function initials(user) {
  return `${user?.full_name?.[0] || "U"}${user?.surname?.[0] || ""}`.toUpperCase();
}

async function logout() {
  localStorage.removeItem(authTokenKey);
  await api("logout");
  window.location.href = "index.html";
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem(authTokenKey, token);
  } else {
    localStorage.removeItem(authTokenKey);
  }
}

function drawPie(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (window.Chart) {
    new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: data.map((item) => item[0]),
        datasets: [{ data: data.map((item) => Number(item[1] || 0)), backgroundColor: data.map((item) => item[2]) }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    });
    return;
  }
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const total = data.reduce((sum, item) => sum + Number(item[1] || 0), 0);
  if (!total) {
    ctx.fillStyle = "#657186";
    ctx.font = "14px Segoe UI";
    ctx.fillText("No chart data available yet.", 20, 40);
    return;
  }
  const radius = Math.min(rect.width, rect.height) / 2 - 30;
  const cx = rect.width / 2 - 40;
  const cy = rect.height / 2;
  let start = -Math.PI / 2;
  data.forEach(([label, value, color], index) => {
    const slice = (Number(value) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    start += slice;
    ctx.fillRect(rect.width - 135, 35 + index * 26, 12, 12);
    ctx.fillStyle = "#18212f";
    ctx.font = "13px Segoe UI";
    ctx.fillText(`${label} (${value})`, rect.width - 116, 46 + index * 26);
  });
}

function drawBar(canvasId, labels, values, color = "#0f8b8d") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (window.Chart) {
    new Chart(canvas, {
      type: "bar",
      data: { labels, datasets: [{ label: "Investment Amount", data: values, backgroundColor: color }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });
    return;
  }
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const max = Math.max(...values.map(Number), 1);
  const width = Math.max(24, (rect.width - 60) / Math.max(values.length, 1) - 14);
  values.forEach((value, index) => {
    const height = (Number(value) / max) * (rect.height - 70);
    const x = 34 + index * (width + 14);
    const y = rect.height - height - 34;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#657186";
    ctx.font = "11px Segoe UI";
    ctx.fillText(String(labels[index]).slice(0, 10), x, rect.height - 12);
  });
}

function colorForRisk(risk) {
  return risk === "High" ? "#bf3b3b" : risk === "Medium" ? "#f2a541" : "#0f8b8d";
}
