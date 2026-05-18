const signInForm =
  document.querySelector("#signin-form") ||
  document.querySelector("#sign-in-form") ||
  document.querySelector("[data-auth-form='signin']");

const signUpForm =
  document.querySelector("#signup-form") ||
  document.querySelector("#sign-up-form") ||
  document.querySelector("[data-auth-form='signup']");

const signInPanel =
  document.querySelector("[data-auth-panel='signin']") ||
  signInForm?.closest("[data-auth-panel], .auth-panel, .auth-card, .auth-form-wrap") ||
  null;

const signUpPanel =
  document.querySelector("[data-auth-panel='signup']") ||
  signUpForm?.closest("[data-auth-panel], .auth-panel, .auth-card, .auth-form-wrap") ||
  null;

const messageHost =
  document.querySelector("#auth-message") ||
  document.querySelector(".auth-message") ||
  document.querySelector("[data-auth-message]");

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
  const signinActive = mode === "signin";

  if (signInPanel) {
    signInPanel.hidden = !signinActive;
    signInPanel.classList.toggle("active", signinActive);
  }

  if (signUpPanel) {
    signUpPanel.hidden = signinActive;
    signUpPanel.classList.toggle("active", !signinActive);
  }

  document.querySelectorAll("[data-auth-switch]").forEach((button) => {
    const target = button.getAttribute("data-auth-switch");
    button.classList.toggle("active", target === mode);
  });
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

document.querySelectorAll("[data-auth-switch]").forEach((button) => {
  button.addEventListener("click", () => {
    toggleAuth(button.getAttribute("data-auth-switch") || "signin");
    authMessage("");
  });
});

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
