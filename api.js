async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const response = await fetch(API_BASE + path, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    window.location.href = "/login.html";
    throw new Error("Unauthorized");
  }

  return response;
}
