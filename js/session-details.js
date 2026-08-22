/*
=========================================
Purpose Institute SESSION DETAILS
=========================================
*/

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("id");

if (!sessionId) {
  alert("Session not found.");
  window.location.href = "courses.html";
}

const uploadBtn = document.getElementById("uploadMaterial");
const publishToggle = document.getElementById("publishToggle");
const publishToggleText = document.getElementById("publishToggleText");

let currentPublishStatus = "Draft";

uploadBtn.addEventListener("click", () => {
  window.location.href = `upload-material.html?session=${sessionId}`;
});

/* ==========================
Publish / Unpublish Toggle
(controls whether students can see this
session at all — separate from the
Live/Ended timing status below)
========================== */

function updatePublishButton() {
  publishToggleText.textContent = currentPublishStatus === "Published" ? "Unpublish" : "Publish";
}

publishToggle.addEventListener("click", async () => {

  const newStatus = currentPublishStatus === "Published" ? "Draft" : "Published";

  const { error } = await client
    .from("course_sessions")
    .update({ status: newStatus })
    .eq("session_id", sessionId);

  if (error) {
    alert(error.message);
    return;
  }

  currentPublishStatus = newStatus;
  updatePublishButton();

});

/* ==========================
Compute Live/Ended Status
(purely time-based, separate from the
Draft/Published toggle above)
========================== */

function computeTimingStatus(session) {

  if (!session.scheduled_date || !session.start_time || !session.end_time) {
    return "Scheduled";
  }

  const start = new Date(`${session.scheduled_date}T${session.start_time}`);
  const end = new Date(`${session.scheduled_date}T${session.end_time}`);
  const now = new Date();

  if (now < start) return "Scheduled";
  if (now <= end) return "Live";
  return "Ended";

}

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

  currentPublishStatus = data.status;
  updatePublishButton();

  const timingStatus = computeTimingStatus(data);
  const statusEl = document.getElementById("sessionStatus");
  statusEl.textContent = timingStatus;

  const statusColors = { Scheduled: "#94A3B8", Live: "#34C759", Ended: "#64748B" };
  statusEl.style.color = statusColors[timingStatus];

  if (data.scheduled_date) {
    const dateLabel = new Date(data.scheduled_date).toLocaleDateString();
    const timeLabel = data.start_time ? ` at ${data.start_time}` : "";
    document.getElementById("scheduledDate").textContent = dateLabel + timeLabel;
  } else {
    document.getElementById("scheduledDate").textContent = "-";
  }

}

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
          <button class="delete-btn" onclick="deleteMaterial(${material.material_id})">
            Delete
          </button>
        </td>
      </tr>
    `;
  });

}

async function deleteMaterial(materialId) {

  const confirmed = confirm("Delete this material? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await client
    .from("session_materials")
    .delete()
    .eq("material_id", materialId);

  if (error) {
    alert(error.message);
    return;
  }

  loadMaterials();

}

/* ==========================
Load Attendance (auto-marked via quiz)
========================== */

async function loadAttendance() {

  const { data, error } = await client
    .from("session_attendance")
    .select("*, students(full_name, matric_number)")
    .eq("session_id", sessionId)
    .order("marked_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("attendanceCount").textContent = data.length;

  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  if (data.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:30px;">
          No attendance marked yet.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(record => {
    table.innerHTML += `
      <tr>
        <td>${record.students.full_name}</td>
        <td>${record.students.matric_number || "-"}</td>
        <td>${new Date(record.marked_at).toLocaleString()}</td>
      </tr>
    `;
  });

}

/* ==========================
Load Quiz
========================== */

async function loadQuiz() {

  const { data: quiz, error } = await client
    .from("quizzes")
    .select("*, quiz_questions(question_id)")
    .eq("session_id", sessionId)
    .maybeSingle();

  const box = document.getElementById("quizBox");

  if (error) {
    console.error(error);
    return;
  }

  if (!quiz) {
    box.innerHTML = `
      <p style="color:#94A3B8; margin-bottom:16px;">No quiz created for this session yet.</p>
      <button class="assign-btn" onclick="window.location.href='create-quiz.html?session=${sessionId}'">
        <i class="fa-solid fa-plus"></i> Create Quiz
      </button>
    `;
    return;
  }

  const questionCount = quiz.quiz_questions.length;
  const statusClass = quiz.status === "Published" ? "active" : "pending";

  box.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
      <div>
        <strong>${quiz.title}</strong>
        <span class="status ${statusClass}" style="margin-left:10px;">${quiz.status}</span>
        <p style="color:#64748B; margin-top:6px;">${questionCount} question${questionCount !== 1 ? "s" : ""}</p>
      </div>
      <div style="display:flex; gap:12px;">
        <button class="view-btn" onclick="window.location.href='create-quiz.html?session=${sessionId}'">
          <i class="fa-solid fa-pen"></i> Edit Quiz
        </button>
        <button class="assign-btn" onclick="window.location.href='quiz-results.html?quiz=${quiz.quiz_id}'">
          <i class="fa-solid fa-chart-simple"></i> View Results
        </button>
      </div>
    </div>
  `;

}

/* ==========================
Start
========================== */

loadSession();
loadMaterials();
loadAttendance();
loadQuiz();