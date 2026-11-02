document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("login-form");
  const alert = document.getElementById("alert");

  if (getToken()) {
    window.location.href = "/dashboard.html";
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = form.querySelector("button[type=submit]");

    if (!email || !password) {
      showAlert("Please fill in all fields.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Signing in…";

    try {
      const res = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.message || data.error || "Login failed. Check your credentials.", "error");
        return;
      }

      setToken(data.token);
      window.location.href = "/dashboard.html";
    } catch (err) {
      if (err.message !== "Unauthorized") {
        showAlert("Could not connect to the server. Make sure the API is running.", "error");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });

  function showAlert(msg, type) {
    alert.textContent = msg;
    alert.className = "alert show alert-" + type;
  }

  function hideAlert() {
    alert.className = "alert";
  }
});
