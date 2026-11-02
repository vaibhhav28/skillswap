document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("register-form");
  const alert = document.getElementById("alert");

  if (getToken()) {
    window.location.href = "/dashboard.html";
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;
    const btn = form.querySelector("button[type=submit]");

    if (!name || !email || !password || !confirm) {
      showAlert("Please fill in all fields.", "error");
      return;
    }

    if (password !== confirm) {
      showAlert("Passwords do not match.", "error");
      return;
    }

    if (password.length < 6) {
      showAlert("Password must be at least 6 characters.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Creating account…";

    try {
      const res = await apiFetch("/api/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.message || data.error || "Registration failed. Please try again.", "error");
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
      btn.textContent = "Create Account";
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
