/*
=========================================
VALMS SESSION DETAILS
=========================================
*/

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("id");

if (!sessionId) {
  alert("Session not found.");
  window.location.href = "courses.html";
}

const logoutBtn = document.getElementById("logoutBtn");
const uploadBtn = document.getElementById("uploadMaterial");
const publishToggle = document.getElementById("publishToggle");
const publishToggleText = document.getElementById("publishToggleText");

let currentStatus = "Draft";

/* ==========================
Upload Material
========================== */

uploadBtn.addEventListener("click", () => {
  window.location.href = `upload-material.html?session=${sessionId}`;
});

/* ==========================
Load Session
========================== */

async function loadSession() {

  const { data, error } = await client
    .from("course_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error || !data) {
    console.error(error);
    alert("Session not found.");
    window.location.href = "courses.html";
    return;
  }

  document.getElementById("sessionTitle").textContent = data.title;
  document.getElementById("sessionType").textContent = data.session_type;
  document.getElementById("description").textContent = data.description || "No description provided.";
  document.getElementById("sessionStatus").textContent = data.status;

  currentStatus = data.status;
  updatePublishButton();

  if (data.scheduled_date) {
    const dateLabel = new Date(data.scheduled_date).toLocaleDateString();
    const timeLabel = data.start_time ? ` at ${data.start_time}` : "";
    document.getElementById("scheduledDate").textContent = dateLabel + timeLabel;
  } else {
    document.getElementById("scheduledDate").textContent = "-";
  }

}

/* ==========================
Publish / Unpublish Toggle
========================== */

function updatePublishButton() {
  publishToggleText.textContent = currentStatus === "Published" ? "Unpublish" : "Publish";
}

publishToggle.addEventListener("click", async () => {

  const newStatus = currentStatus === "Published" ? "Draft" : "Published";

  const { error } = await client
    .from("course_sessions")
    .update({ status: newStatus })
    .eq("session_id", sessionId);

  if (error) {
    alert(error.message);
    return;
  }

  currentStatus = newStatus;
  document.getElementById("sessionStatus").textContent = newStatus;
  updatePublishButton();

});

/* ==========================
Load Materials
========================== */

async function loadMaterials() {

  const { data, error } = await client
    .from("session_materials")
    .select("*")
    .eq("session_id", sessionId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("materialCount").textContent = data.length;

  const table = document.getElementById("materialTable");
  table.innerHTML = "";

  if (data.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 40px;">
          No materials uploaded.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(material => {
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

loadSession();
loadMaterials();