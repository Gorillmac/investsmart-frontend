const signInForm =
  document.querySelector("#signin-form") ||
  document.querySelector("#sign-in-form") ||
  document.querySelector("#login-form") ||
  document.querySelector("[data-auth-form='signin']");

const signUpForm =
  document.querySelector("#signup-form") ||
  document.querySelector("#sign-up-form") ||
  document.querySelector("#register-form") ||
  document.querySelector("[data-auth-form='signup']");

const loginOtpForm = document.querySelector("#login-otp-form");
const forgotPasswordForm = document.querySelector("#forgot-password-form");
const resetPasswordForm = document.querySelector("#reset-password-form");
const homePanel = document.querySelector("#home-panel");
const authPanel = document.querySelector("#auth-panel");
const backHomeButton = document.querySelector("#back-home");
const loginOtpCode = document.querySelector("#login-otp-code");
const resetOtpCode = document.querySelector("#reset-otp-code");

const authForms = {
  signin: signInForm,
  signup: signUpForm,
  "login-otp": loginOtpForm,
  forgot: forgotPasswordForm,
  reset: resetPasswordForm,
};

const messageHost =
  document.querySelector("#auth-message") ||
  document.querySelector(".auth-message") ||
  document.querySelector("[data-auth-message]");

function normalizeAuthMode(mode) {
  if (mode === "login" || mode === "signin" || mode === "sign-in") {
    return "signin";
  }

  if (mode === "register" || mode === "signup" || mode === "sign-up") {
    return "signup";
  }

  if (mode === "otp" || mode === "loginotp" || mode === "login-otp") {
    return "login-otp";
  }

  if (mode === "forgot-password") {
    return "forgot";
  }

  return mode || "signin";
}

function authMessage(text, type = "info") {
  if (!messageHost) {
    if (text) {
      alert(text);
    }
    return;
  }

  messageHost.textContent = text || "";
  messageHost.className = `auth-message ${type}`.trim();
  messageHost.hidden = !text;
}

function toggleAuth(mode) {
  mode = normalizeAuthMode(mode);

  Object.entries(authForms).forEach(([formMode, form]) => {
    if (!form) return;
    const active = formMode === mode;
    form.hidden = !active;
    form.classList.toggle("hidden", !active);
    form.classList.toggle("active", active);
  });

  document.querySelectorAll("[data-auth-switch], [data-auth-tab]").forEach((button) => {
    const target = normalizeAuthMode(button.getAttribute("data-auth-switch") || button.getAttribute("data-auth-tab"));
    button.classList.toggle("active", target === mode);
  });
}

function openAuth(mode = "signin") {
  if (homePanel) {
    homePanel.hidden = true;
    homePanel.classList.add("hidden");
  }

  if (authPanel) {
    authPanel.hidden = false;
    authPanel.classList.remove("hidden");
    authPanel.classList.add("active");
  }

  toggleAuth(mode);
}

function closeAuth() {
  if (authPanel) {
    authPanel.hidden = true;
    authPanel.classList.add("hidden");
    authPanel.classList.remove("active");
  }

  if (homePanel) {
    homePanel.hidden = false;
    homePanel.classList.remove("hidden");
  }

  authMessage("");
}

function setPendingEmail(email) {
  if (!email) return;
  try {
    sessionStorage.setItem("investsmart_pending_email", email);
  } catch (error) {
    console.warn("Could not save pending email", error);
  }
}

function applyPendingEmail() {
  if (!signInForm) return;

  try {
    const pendingEmail = sessionStorage.getItem("investsmart_pending_email");
    if (!pendingEmail) return;
    const emailInput = signInForm.querySelector('input[name="email"]');
    if (emailInput) {
      emailInput.value = pendingEmail;
    }
    sessionStorage.removeItem("investsmart_pending_email");
  } catch (error) {
    console.warn("Could not restore pending email", error);
  }
}

function redirectForRole(user) {
  if (!user) return;
  if (user.role === "admin") {
    window.location.href = "admin-dashboard.html";
    return;
  }

  if (!user.has_finance_profile) {
    window.location.href = "my-finances.html";
    return;
  }

  window.location.href = "dashboard.html";
}

function authSwitchTarget(element) {
  const explicit =
    element.getAttribute("data-auth-switch") ||
    element.getAttribute("data-auth-tab") ||
    element.getAttribute("data-open-auth");
  if (explicit) return explicit;

  const href = element.getAttribute("href") || "";
  const normalizedHref = href.toLowerCase();
  if (normalizedHref === "#signup" || normalizedHref === "#register") {
    return "signup";
  }

  if (normalizedHref === "#signin" || normalizedHref === "#login") {
    return "signin";
  }

  if (normalizedHref === "#forgot" || normalizedHref === "#forgot-password") {
    return "forgot";
  }

  return null;
}

function setFormEmail(form, email) {
  const input = form?.querySelector('input[name="email"]');
  if (input) {
    input.value = email || "";
  }
}

function setOtpDisplay(host, otp, delivery = "screen") {
  if (!host) return;

  const card = host.closest(".otp-card");
  if (otp && delivery !== "email") {
    host.textContent = otp;
    if (card) {
      card.hidden = false;
      card.classList.remove("hidden");
    }
    return;
  }

  host.textContent = "";
  if (card) {
    card.hidden = true;
    card.classList.add("hidden");
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-auth], [data-auth-switch], [data-auth-tab], a[href='#signin'], a[href='#login'], a[href='#signup'], a[href='#register'], a[href='#forgot'], a[href='#forgot-password']");
  if (!button) return;

  const target = authSwitchTarget(button);
  if (!target) return;

  event.preventDefault();
  openAuth(target);
  authMessage("");
});

if (backHomeButton) {
  backHomeButton.addEventListener("click", closeAuth);
}

if (signInForm) {
  signInForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage("");

    const formData = new FormData(signInForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await api("login", { method: "POST", body: payload });
      if (response.otp_required) {
        setFormEmail(loginOtpForm, response.email || payload.email);
        setOtpDisplay(loginOtpCode, response.otp, response.otp_delivery);
        const otpInput = loginOtpForm?.querySelector('input[name="otp"]');
        if (otpInput) {
          otpInput.value = "";
        }
        toggleAuth("login-otp");
        authMessage(`${response.message} It expires in ${response.expires_in_minutes || 10} minutes.`, "success");
        return;
      }

      if (response.token) {
        setAuthToken(response.token);
      }
      authMessage("Signed in successfully.", "success");
      redirectForRole(response.user || null);
    } catch (error) {
      authMessage(error.message || "Unable to sign in. Please try again.", "error");
    }
  });
}

if (loginOtpForm) {
  loginOtpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage("");

    const payload = Object.fromEntries(new FormData(loginOtpForm).entries());

    try {
      const response = await api("verify-login-otp", { method: "POST", body: payload });
      if (response.token) {
        setAuthToken(response.token);
      }
      loginOtpForm.reset();
      authMessage("OTP verified. Signed in successfully.", "success");
      redirectForRole(response.user || null);
    } catch (error) {
      authMessage(error.message || "OTP verification failed. Please try again.", "error");
    }
  });
}

if (signUpForm) {
  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage("");

    const formData = new FormData(signUpForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await api("register", { method: "POST", body: payload });
      signUpForm.reset();
      setPendingEmail(response.email || payload.email || "");
      toggleAuth("signin");
      authMessage(`${response.message || "Account created successfully. Please sign in."} Each login will ask for an OTP.`, "success");
      applyPendingEmail();
    } catch (error) {
      authMessage(error.message || "Unable to create the account right now. Please try again.", "error");
    }
  });
}

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage("");

    const payload = Object.fromEntries(new FormData(forgotPasswordForm).entries());

    try {
      const response = await api("forgot-password", { method: "POST", body: payload });
      setFormEmail(resetPasswordForm, response.email || payload.email);
      setOtpDisplay(resetOtpCode, response.otp, response.otp_delivery);
      const otpInput = resetPasswordForm?.querySelector('input[name="otp"]');
      if (otpInput) {
        otpInput.value = "";
      }
      toggleAuth("reset");
      authMessage(`${response.message} It expires in ${response.expires_in_minutes || 10} minutes.`, "success");
    } catch (error) {
      authMessage(error.message || "Unable to request a reset OTP.", "error");
    }
  });
}

if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage("");

    const payload = Object.fromEntries(new FormData(resetPasswordForm).entries());

    try {
      const response = await api("reset-password", { method: "POST", body: payload });
      resetPasswordForm.reset();
      setPendingEmail(response.email || payload.email || "");
      toggleAuth("signin");
      authMessage(response.message || "Password updated successfully. Please sign in.", "success");
      applyPendingEmail();
    } catch (error) {
      authMessage(error.message || "Unable to reset the password.", "error");
    }
  });
}

applyPendingEmail();
toggleAuth("signin");
