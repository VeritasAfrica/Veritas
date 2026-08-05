/*
=========================================
VALMS STUDENT MATERIAL VIEW
=========================================
*/

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("id");

if (!sessionId) {
  alert("Session not found.");
  window.location.href = "student-courses.html";
}

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");
const logoutBtn = document.getElementById("logoutBtn");

/* ==========================
Mobile Menu
========================== */

menuBtn.addEventListener("click", () => {
  sidebar.classList.add("show");
  overlay.classList.add("show");
});

overlay.addEventListener("click", () => {
  sidebar.classList.remove("show");
  overlay.classList.remove("show");
});

/* ==========================
Logout
========================== */

logoutBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  await client.auth.signOut();
  window.location.href = "login.html";
});

/* ==========================
Load Avatar
========================== */

async function loadAvatar() {

  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  const { data } = await client
    .from("students")
    .select("first_name, last_name")
    .eq("auth_user_id", user.id)
    .single();

  if (data) {
    const initials = (data.first_name[0] + data.last_name[0]).toUpperCase();
    document.getElementById("topAvatar").textContent = initials;
  }

}

/* ==========================
Load Session
========================== */

async function loadSession() {

  const { data: session, error } = await client
    .from("course_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error || !session) {
    console.error(error);
    alert("Session not found.");
    window.location.href = "student-courses.html";
    return;
  }

  document.getElementById("sessionTitle").textContent = session.title;
  document.getElementById("sessionType").textContent = session.session_type;
  document.getElementById("description").textContent = session.description || "No description provided.";

  const dateLabel = session.scheduled_date
    ? new Date(session.scheduled_date).toLocaleDateString()
    : null;

  const timeLabel = session.start_time || null;

  const scheduleText = dateLabel
    ? `${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}`
    : null;

  const actionBox = document.getElementById("sessionAction");

  if (session.session_type === "Live") {

    if (session.meeting_url) {
      actionBox.innerHTML = `
        <div class="table-card" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
          <div>
            <strong>Live Session</strong>
            ${scheduleText ? `<p style="color:#6B7280; margin-top:4px;">${scheduleText}</p>` : ""}
          </div>
          <a href="${session.meeting_url}" target="_blank" class="view-btn" style="text-decoration:none;">
            <i class="fa-solid fa-video"></i> Join Live Session
          </a>
        </div>
      `;
    } else {
      actionBox.innerHTML = `
        <div class="table-card">
          <strong>Live Session</strong>
          ${scheduleText ? `<p style="color:#6B7280; margin-top:4px;">${scheduleText}</p>` : ""}
          <p style="color:#94A3B8; margin-top:8px;">Meeting link not yet available. Check back closer to the session time.</p>
        </div>
      `;
    }

  } else if (session.session_type === "Recorded") {

    if (session.video_url) {
      actionBox.innerHTML = `
        <div class="table-card" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
          <div>
            <strong>Recorded Session</strong>
            ${scheduleText ? `<p style="color:#6B7280; margin-top:4px;">Released ${scheduleText}</p>` : ""}
          </div>
          <a href="${session.video_url}" target="_blank" class="view-btn" style="text-decoration:none;">
            <i class="fa-solid fa-circle-play"></i> Watch Recording
          </a>
        </div>
      `;
    } else {
      actionBox.innerHTML = `
        <div class="table-card">
          <strong>Recorded Session</strong>
          <p style="color:#94A3B8; margin-top:8px;">Recording not yet uploaded.</p>
        </div>
      `;
    }

  }

}

/* ==========================
Load Materials
========================== */

async function loadMaterials() {

  const { data: materials, error } = await client
    .from("session_materials")
    .select("*")
    .eq("session_id", sessionId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const table = document.getElementById("materialTable");
  table.innerHTML = "";

  if (materials.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 40px;">
          No materials uploaded.
        </td>
      </tr>
    `;
    return;
  }

  materials.forEach(material => {
    table.innerHTML += `
      <tr>
        <td>${material.title}</td>
        <td>${material.file_type}</td>
        <td>
          <a href="${material.file_url}" target="_blank" class="view-btn" style="text-decoration: none;">
            Open
          </a>
        </td>
      </tr>
    `;
  });

}

/* ==========================
Start
========================== */

loadAvatar();
loadSession();
loadMaterials();