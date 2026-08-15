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


const ATTENDANCE_WINDOW_MINUTES = 60; // how long a code stays open — adjust freely

/* ==========================
Start Class
========================== */

document.getElementById("startClassBtn").addEventListener("click", async () => {

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const closesAt = new Date(Date.now() + ATTENDANCE_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { error: sessionError } = await client
    .from("course_sessions")
    .update({
      session_status: "Live",
      class_started_at: new Date().toISOString()
    })
    .eq("session_id", sessionId);

  if (sessionError) {
    alert(sessionError.message);
    return;
  }

  const { error: attendanceError } = await client
    .from("attendance_sessions")
    .insert({
      session_id: sessionId,
      attendance_code: code,
      closes_at: closesAt,
      status: "Open"
    });

  if (attendanceError) {
    alert(attendanceError.message);
    return;
  }

  loadClassStatus();

});

/* ==========================
End Class
========================== */

document.getElementById("endClassBtn").addEventListener("click", async () => {

  const confirmed = confirm("End this class? This will close attendance too.");
  if (!confirmed) return;

  const { error: sessionError } = await client
    .from("course_sessions")
    .update({
      session_status: "Ended",
      class_ended_at: new Date().toISOString()
    })
    .eq("session_id", sessionId);

  if (sessionError) {
    alert(sessionError.message);
    return;
  }

  const { error: attendanceError } = await client
    .from("attendance_sessions")
    .update({ status: "Closed" })
    .eq("session_id", sessionId)
    .eq("status", "Open");

  if (attendanceError) {
    console.error(attendanceError);
  }

  loadClassStatus();

});

/* ==========================
Load Class Status
========================== */

async function loadClassStatus() {

  const { data: session, error } = await client
    .from("course_sessions")
    .select("session_status, class_started_at, class_ended_at")
    .eq("session_id", sessionId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const statusBox = document.getElementById("classStatusBox");
  const startBtn = document.getElementById("startClassBtn");
  const endBtn = document.getElementById("endClassBtn");
  const codeBox = document.getElementById("attendanceCodeBox");

  const statusColors = {
    Scheduled: "#94A3B8",
    Live: "#34C759",
    Ended: "#64748B"
  };

  statusBox.innerHTML = `
    <span class="status" style="background:${statusColors[session.session_status]}22; color:${statusColors[session.session_status]};">
      ${session.session_status}
    </span>
    ${session.class_started_at ? `<p style="color:#64748B; margin-top:8px; font-size:13px;">Started ${new Date(session.class_started_at).toLocaleString()}</p>` : ""}
    ${session.class_ended_at ? `<p style="color:#64748B; font-size:13px;">Ended ${new Date(session.class_ended_at).toLocaleString()}</p>` : ""}
  `;

  if (session.session_status === "Live") {
    startBtn.style.display = "none";
    endBtn.style.display = "inline-flex";
    loadAttendanceCode();
  } else {
    startBtn.style.display = "inline-flex";
    endBtn.style.display = "none";
    startBtn.innerHTML = session.session_status === "Ended"
      ? `<i class="fa-solid fa-rotate-right"></i> Restart Class`
      : `<i class="fa-solid fa-play"></i> Start Class`;
    codeBox.innerHTML = "";
  }

}

/* ==========================
Load Current Attendance Code
========================== */

async function loadAttendanceCode() {

  const { data, error } = await client
    .from("attendance_sessions")
    .select("attendance_code, closes_at")
    .eq("session_id", sessionId)
    .eq("status", "Open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const codeBox = document.getElementById("attendanceCodeBox");

  if (error || !data) {
    codeBox.innerHTML = "";
    return;
  }

  const expired = new Date(data.closes_at) < new Date();
  const link = `${window.location.origin}${window.location.pathname.replace("session-details.html", "mark-attendance.html")}?code=${data.attendance_code}`;

  codeBox.innerHTML = `
    <div style="background:#F8FAFC; border-radius:14px; padding:20px;">
      <p style="font-size:14px; color:#64748B; margin-bottom:6px;">
        ${expired ? "Attendance window closed" : `Open until ${new Date(data.closes_at).toLocaleTimeString()}`} — share this link:
      </p>
      <p style="font-family:monospace; font-size:16px; font-weight:600; word-break:break-all;">
        ${link}
      </p>
    </div>
  `;

}

/* ==========================
Load Attendance Records
========================== */

async function loadAttendance() {

  const { data, error } = await client
    .from("attendance_records")
    .select("*, students(full_name, matric_number), attendance_sessions!inner(session_id)")
    .eq("attendance_sessions.session_id", sessionId)
    .order("marked_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

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
loadClassStatus();
loadAttendance();
loadQuiz();