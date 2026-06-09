(() => {
  const $ = (selector) => document.querySelector(selector);

  function setMessage(text, type = "success") {
    const box = $("#auth-message");
    if (!box) return;
    box.textContent = text;
    box.className = `auth-message ${type}`;
  }

  function showOtpPanel(email, minutes) {
    const loginForm = $("#login-form");
    let otpForm = $("#login-otp-form");
    if (!otpForm) {
      otpForm = document.createElement("form");
      otpForm.id = "login-otp-form";
      otpForm.className = "auth-form";
      otpForm.innerHTML = `
        <h2>Verify Login</h2>
        <p class="muted">Enter the OTP sent to your email address.</p>
        <input type="hidden" name="email">
        <label>OTP Code<input name="otp" inputmode="numeric" autocomplete="one-time-code" required></label>
        <button type="submit" class="btn primary">Verify OTP</button>
      `;
      loginForm?.insertAdjacentElement("afterend", otpForm);
    }

    if (loginForm) loginForm.hidden = true;
    otpForm.hidden = false;
    otpForm.classList.remove("is-hidden", "hidden");

    const emailInput = otpForm.querySelector('[name="email"]');
    const otpInput = otpForm.querySelector('[name="otp"]');

    if (emailInput) emailInput.value = email || "";
    if (otpInput) {
      otpInput.value = "";
      otpInput.focus();
    }

    setMessage(`Enter the OTP sent to your email. It expires in ${minutes || 10} minutes.`, "success");
    return true;
  }

  async function postJson(action, payload) {
    const apiBase = window.INVESTSMART_API_BASE || "http://127.0.0.1/investsmart/backend/api/index.php";
    const response = await fetch(`${apiBase}?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Backend did not return valid JSON. Check ngrok and env.js.");
    }
    if (!response.ok || data.success === false) {
      throw new Error(data.message || data.error || "Request failed.");
    }
    return data;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const loginForm = $("#login-form");
    const otpForm = $("#login-otp-form");
    if (!loginForm || !otpForm) return;

    loginForm.addEventListener("submit", async (event) => {
      const submitter = event.submitter;
      if (submitter && submitter.dataset.skipOtpFallback === "true") return;

      window.setTimeout(async () => {
        if (!otpForm.hidden || otpForm.offsetParent !== null) return;

        const email = loginForm.querySelector('[name="email"]')?.value?.trim();
        const password = loginForm.querySelector('[name="password"]')?.value || "";
        if (!email || !password) return;

        try {
          const data = await postJson("login", { email, password });
          if (data.otp_required) {
            showOtpPanel(data.email || email, data.expires_in_minutes);
          }
        } catch (error) {
          setMessage(error.message, "error");
        }
      }, 700);
    }, true);

    otpForm.addEventListener("submit", async (event) => {
      if (window.__investSmartOtpHandled) return;
      event.preventDefault();

      const email = otpForm.querySelector('[name="email"]')?.value?.trim();
      const otp = otpForm.querySelector('[name="otp"]')?.value?.trim();
      if (!email || !otp) {
        setMessage("Please enter the OTP shown on the screen.", "error");
        return;
      }

      try {
        const data = await postJson("verify-login-otp", { email, otp });
        if (data.token) localStorage.setItem("investsmart_token", data.token);
        if (data.user) localStorage.setItem("investsmart_user", JSON.stringify(data.user));
        window.location.href = data.user?.role === "admin" ? "admin-dashboard.html" : "dashboard.html";
      } catch (error) {
        setMessage(error.message, "error");
      }
    });
  });
})();
