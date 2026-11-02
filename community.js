document.addEventListener("DOMContentLoaded", function () {
  requireAuth();

  const matchesGrid = document.getElementById("matches-grid");

  loadMatches();

  async function loadMatches() {
    matchesGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Finding your matches…</p></div>';

    try {
      const res = await apiFetch("/api/matches");
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to load matches.");

      const matches = (data.matches || data).sort((a, b) => (b.match_percent || 0) - (a.match_percent || 0));

      if (!matches.length) {
        matchesGrid.innerHTML = '<div class="empty">No matches found yet. Add more skills to your profile to get matched!</div>';
        return;
      }

      matchesGrid.innerHTML = '';
      matches.forEach(match => {
        matchesGrid.appendChild(createMatchCard(match));
      });
    } catch (err) {
      if (err.message !== "Unauthorized") {
        matchesGrid.innerHTML = '<div class="empty">Could not load matches. Make sure the API server is running.</div>';
      }
    }
  }

  function createMatchCard(match) {
    const card = document.createElement("div");
    card.className = "match-card";

    const name = match.name || "User";
    const initial = name[0].toUpperCase();
    const percent = match.match_percent || 0;
    const canTeach = match.can_teach_them || match.mutual_offer || [];
    const theyTeach = match.they_can_teach || match.mutual_want || [];
    const userId = match.user_id || match.id;

    const teachHtml = canTeach.length
      ? canTeach.map(s => '<span class="chip">' + escHtml(s.skill_name || s) + '</span>').join("")
      : '<span class="text-muted text-sm">None</span>';

    const theyHtml = theyTeach.length
      ? theyTeach.map(s => '<span class="chip chip-want">' + escHtml(s.skill_name || s) + '</span>').join("")
      : '<span class="text-muted text-sm">None</span>';

    card.innerHTML =
      '<div class="match-card-header">' +
        '<div class="avatar avatar-sm">' + initial + '</div>' +
        '<div class="match-meta">' +
          '<h3>' + escHtml(name) + '</h3>' +
          (match.bio ? '<p>' + escHtml(match.bio.slice(0, 60)) + (match.bio.length > 60 ? '…' : '') + '</p>' : '') +
        '</div>' +
        '<div class="match-percent">' + percent + '<span>%</span></div>' +
      '</div>' +
      '<div class="match-section">' +
        '<h4>You can teach them</h4>' +
        '<div class="chip-list">' + teachHtml + '</div>' +
      '</div>' +
      '<div class="match-section">' +
        '<h4>They can teach you</h4>' +
        '<div class="chip-list">' + theyHtml + '</div>' +
      '</div>' +
      '<div class="match-card-footer">' +
        '<a href="/profile.html?user_id=' + encodeURIComponent(userId) + '" class="btn btn-outline btn-sm">View Profile</a>' +
      '</div>';

    return card;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
});
