document.addEventListener("DOMContentLoaded", function () {
  requireAuth();

  const params = new URLSearchParams(window.location.search);
  const userId = params.get("user_id");

  if (!userId) {
    document.getElementById("profile-content").innerHTML =
      '<div class="empty">No user specified. <a href="/community.html" class="text-accent">Go back to Community</a></div>';
    return;
  }

  loadProfile();

  async function loadProfile() {
    try {
      const res = await apiFetch("/api/users/" + encodeURIComponent(userId));
      const data = await res.json();

      if (!res.ok) {
        document.getElementById("profile-content").innerHTML =
          '<div class="empty">' + escHtml(data.message || "User not found.") + '</div>';
        return;
      }

      renderProfile(data);
    } catch (err) {
      if (err.message !== "Unauthorized") {
        document.getElementById("profile-content").innerHTML =
          '<div class="empty">Could not load profile. Make sure the API server is running.</div>';
      }
    }
  }

  function renderProfile(user) {
    const name = user.name || "User";
    const initial = name[0].toUpperCase();
    const email = user.email || "";
    const bio = user.bio || "No bio provided.";
    const offered = (user.skills || []).filter(s => s.skill_type === "offer");
    const wanted = (user.skills || []).filter(s => s.skill_type === "want");

    const offerChips = offered.length
      ? offered.map(s => '<span class="chip">' + escHtml(s.skill_name || s.name) +
          (s.level ? '<span class="chip-level">Lv ' + s.level + '</span>' : '') + '</span>').join("")
      : '<div class="empty">No skills offered.</div>';

    const wantChips = wanted.length
      ? wanted.map(s => '<span class="chip chip-want">' + escHtml(s.skill_name || s.name) +
          (s.level ? '<span class="chip-level">Lv ' + s.level + '</span>' : '') + '</span>').join("")
      : '<div class="empty">No skills wanted.</div>';

    document.getElementById("profile-content").innerHTML =
      '<div class="profile-header">' +
        '<div class="avatar">' + initial + '</div>' +
        '<div class="profile-info">' +
          '<h2>' + escHtml(name) + '</h2>' +
          '<p>' + escHtml(email) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="card mb-16">' +
        '<h3 class="section-title">About</h3>' +
        '<p class="text-muted">' + escHtml(bio) + '</p>' +
      '</div>' +
      '<div class="dashboard-grid">' +
        '<div class="card">' +
          '<div class="skills-section-header">' +
            '<span class="skills-label">Skills Offered</span>' +
            '<span class="badge">' + offered.length + '</span>' +
          '</div>' +
          '<div class="chip-list">' + offerChips + '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="skills-section-header">' +
            '<span class="skills-label">Skills Wanted</span>' +
            '<span class="badge">' + wanted.length + '</span>' +
          '</div>' +
          '<div class="chip-list">' + wantChips + '</div>' +
        '</div>' +
      '</div>';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
});
