function getToken() {
  return localStorage.getItem("skillswap_token");
}

function setToken(token) {
  localStorage.setItem("skillswap_token", token);
}

function clearToken() {
  localStorage.removeItem("skillswap_token");
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login.html";
  }
}

function logout() {
  clearToken();
  window.location.href = "/login.html";
}
