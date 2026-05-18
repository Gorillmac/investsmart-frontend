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

const homePanel = document.querySelector("#home-panel");
const authPanel = document.querySelector("#auth-panel");
const backHomeButton = document.querySelector("#back-home");

let signInPanel =
  document.querySelector("[data-auth-panel='signin']") ||
  signInForm?.closest("[data-auth-panel='signin'], .signin-panel, .login-panel") ||
  signInForm ||
  null;

let signUpPanel =
  document.querySelector("[data-auth-panel='signup']") ||
  signUpForm?.closest("[data-auth-panel='signup'], .signup-panel, .register-panel") ||
  signUpForm ||
  null;

if (signInPanel && signUpPanel && signInPanel === signUpPanel) {
  signInPanel = signInForm;
  signUpPanel = signUpForm;
}

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
  const signinActive = mode === "signin";

  if (signInPanel) {
    signInPanel.hidden = !signinActive;
    signInPanel.classList.toggle("hidden", !signinActive);
    signInPanel.classList.toggle("active", signinActive);
  }

  if (signUpPanel) {
    signUpPanel.hidden = signinActive;
    signUpPanel.classList.toggle("hidden", signinActive);
    signUpPanel.classList.toggle("active", !signinActive);
  }

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

  return null;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-auth], [data-auth-switch], [data-auth-tab], a[href='#signin'], a[href='#login'], a[href='#signup'], a[href='#register']");
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
      authMessage(response.message || "Account created successfully. Please sign in.", "success");
      applyPendingEmail();
    } catch (error) {
      authMessage(error.message || "Unable to create the account right now. Please try again.", "error");
    }
  });
}

applyPendingEmail();
toggleAuth("signin");
