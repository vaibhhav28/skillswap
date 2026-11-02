document.addEventListener("DOMContentLoaded", function () {
  requireAuth();

  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  const bioInput = document.getElementById("bio-input");
const saveBioBtn = document.getElementById("save-bio-btn");
const bioAlert = document.getElementById("bio-alert");
  const avatarEl = document.getElementById("avatar");
  const offerList = document.getElementById("offer-list");
  const wantList = document.getElementById("want-list");
  const addForm = document.getElementById("add-skill-form");
  const addAlert = document.getElementById("add-alert");

  loadProfile();
  loadSkills();

  async function loadProfile() {
    try {
      const res = await apiFetch("/api/me");
      const data = await res.json();
      if (!res.ok) return;
      profileName.textContent = data.name || "User";
      profileEmail.textContent = data.email || "";
      bioInput.value = data.bio || "";
      avatarEl.textContent = (data.name || "U")[0].toUpperCase();
    } catch (err) {
      if (err.message !== "Unauthorized") {
        profileName.textContent = "Error loading profile";
      }
    }
  }

  saveBioBtn.addEventListener("click", async function () {
  const bio = bioInput.value.trim();
  saveBioBtn.disabled = true;
  saveBioBtn.textContent = "Saving…";
  hideBioAlert();

  try {
    const res = await apiFetch("/api/me", {
      method: "PUT",
      body: JSON.stringify({ bio }),
    });
    const data = await res.json();

    if (!res.ok) {
      showBioAlert(data.message || data.error || "Failed to save bio.", "error");
      return;
    }
    showBioAlert("Bio saved!", "success");
  } catch (err) {
    if (err.message !== "Unauthorized") {
      showBioAlert("Could not connect to server.", "error");
    }
  } finally {
    saveBioBtn.disabled = false;
    saveBioBtn.textContent = "Save Bio";
  }
});

function showBioAlert(msg, type) {
  bioAlert.textContent = msg;
  bioAlert.className = "alert show alert-" + type;
  setTimeout(() => { bioAlert.className = "alert"; }, 3000);
}

function hideBioAlert() {
  bioAlert.className = "alert";
}

  async function loadSkills() {
    offerList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    wantList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const res = await apiFetch("/api/me/skills");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load skills");

      const offered = (data.skills || data).filter(s => s.skill_type === "offer");
      const wanted = (data.skills || data).filter(s => s.skill_type === "want");

      renderChips(offerList, offered, "offer");
      renderChips(wantList, wanted, "want");
    } catch (err) {
      if (err.message !== "Unauthorized") {
        offerList.innerHTML = '<div class="empty">Could not load skills.</div>';
        wantList.innerHTML = '';
      }
    }
  }

  function renderChips(container, skills, type) {
    if (!skills.length) {
      container.innerHTML = '<div class="empty">No skills added yet.</div>';
      return;
    }
    container.innerHTML = '';
    skills.forEach(skill => {
      const chip = document.createElement("span");
      chip.className = "chip" + (type === "want" ? " chip-want" : "");
      chip.innerHTML =
        (skill.skill_name || skill.name) +
        (skill.level ? '<span class="chip-level">Lv ' + skill.level + '</span>' : '') +
        '<button class="chip-remove" title="Remove" data-id="' + skill.skill_id + '" data-type="' + type + '">&#x2715;</button>';
      container.appendChild(chip);
    });

    container.querySelectorAll(".chip-remove").forEach(btn => {
      btn.addEventListener("click", async function () {
        const id = this.dataset.id;
        const skillType = this.dataset.type;
        this.disabled = true;
        await removeSkill(id, skillType);
        loadSkills();
      });
    });
  }

  async function removeSkill(skillId, skillType) {
    try {
      const res = await apiFetch("/api/me/skills", {
        method: "DELETE",
        body: JSON.stringify({ skill_id: skillId, skill_type: skillType }),
      });
      if (!res.ok) {
        const d = await res.json();
        showAddAlert(d.message || "Failed to remove skill.", "error");
      }
    } catch (err) {
      if (err.message !== "Unauthorized") {
        showAddAlert("Could not connect to server.", "error");
      }
    }
  }

  addForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAddAlert();

    const skill_name = document.getElementById("skill-name").value.trim();
    const skill_type = document.getElementById("skill-type").value;
    const level = parseInt(document.getElementById("skill-level").value) || null;
    const btn = addForm.querySelector("button[type=submit]");

    if (!skill_name) {
      showAddAlert("Please enter a skill name.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Adding…";

    try {
      const body = { skill_name, skill_type };
      if (level && level >= 1 && level <= 5) body.level = level;

      const res = await apiFetch("/api/me/skills", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        showAddAlert(data.message || data.error || "Failed to add skill.", "error");
        return;
      }

      document.getElementById("skill-name").value = "";
      document.getElementById("skill-level").value = "";
      loadSkills();
      showAddAlert("Skill added!", "success");
    } catch (err) {
      if (err.message !== "Unauthorized") {
        showAddAlert("Could not connect to server.", "error");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "Add Skill";
    }
  });

  function showAddAlert(msg, type) {
    addAlert.textContent = msg;
    addAlert.className = "alert show alert-" + type;
    setTimeout(() => { addAlert.className = "alert"; }, 3000);
  }

  function hideAddAlert() {
    addAlert.className = "alert";
  }
});
