function setAuthMode(mode, message = "") {
  $("#home-panel").classList.add("hidden");
  $("#auth-panel").classList.remove("hidden");
  document.querySelectorAll("[data-auth-tab]").forEach((btn) => btn.classList.toggle("active", btn.dataset.authTab === mode));
  $("#login-form").classList.toggle("hidden", mode !== "login");
  $("#register-form").classList.toggle("hidden", mode !== "register");
  $("#admin-login-form").classList.toggle("hidden", mode !== "admin");
  $("#auth-message").textContent = message || (mode === "register" ? "Create your InvestSmart user account." : mode === "admin" ? "Admin users sign in here." : "Sign in to continue to your dashboard.");
}

document.querySelectorAll("[data-open-auth]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.openAuth)));
document.querySelectorAll("[data-auth-tab]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authTab)));
$("#back-home").addEventListener("click", () => {
  $("#auth-panel").classList.add("hidden");
  $("#home-panel").classList.remove("hidden");
});

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = await api("login", { method: "POST", body: formData(event.currentTarget) });
    setAuthToken(payload.token);
    window.location.href = payload.user.role === "admin" ? "admin-dashboard.html" : "dashboard.html";
  } catch (error) {
    showToast(error.message, true);
  }
});

$("#admin-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = await api("login", { method: "POST", body: formData(event.currentTarget) });
    setAuthToken(payload.token);
    if (payload.user.role !== "admin") {
      await logout();
      return;
    }
    window.location.href = "admin-dashboard.html";
  } catch (error) {
    showToast(error.message, true);
  }
});

$("#register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = await api("register", { method: "POST", body: formData(event.currentTarget) });
    setAuthToken(payload.token);
    await api("logout");
    event.currentTarget.reset();
    setAuthMode("login", "Registration successful! Please log in.");
    showToast("Registration successful. Please log in.");
  } catch (error) {
    showToast(error.message, true);
  }
});
