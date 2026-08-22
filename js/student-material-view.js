/*
=========================================
Purpose Institute STUDENT MATERIAL VIEW
=========================================
*/

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("id");

if (!sessionId) {
  alert("Session not found.");
  window.location.href = "student-courses.html";
}

let currentSession = null;

/* ==========================
Compute Session Timing
(purely time-based — no stored
status field needed)
========================== */

function getSessionTiming(session) {

  if (!session.scheduled_date || !session.start_time || !session.end_time) {
    return { started: false, windowEnd: null };
  }

  const start = new Date(`${session.scheduled_date}T${session.start_time}`);
  const end = new Date(`${session.scheduled_date}T${session.end_time}`);
  const durationMs = end - start;
  const windowEnd = new Date(start.getTime() + 2 * durationMs);

  return {
    started: new Date() >= start,
    startTime: start,
    windowEnd
  };

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

  currentSession = session;

  document.getElementById("sessionTitle").textContent = session.title;
  document.getElementById("description").textContent = session.description || "No description provided.";

  const timing = getSessionTiming(session);

  const dateLabel = session.scheduled_date
    ? new Date(session.scheduled_date).toLocaleDateString()
    : null;

  const timeLabel = session.start_time || null;

  const scheduleText = dateLabel
    ? `${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}`
    : null;

  const actionBox = document.getElementById("sessionAction");

  // Class hasn't started yet — hide the link regardless of type
  if (!timing.started) {
    actionBox.innerHTML = `
      <div class="table-card">
        <strong>${session.session_type} Session</strong>
        ${scheduleText ? `<p style="color:#6B7280; margin-top:4px;">Starts ${scheduleText}</p>` : ""}
        <p style="color:#94A3B8; margin-top:8px;">This class hasn't started yet. Check back at the scheduled time.</p>
      </div>
    `;
    return;
  }

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
          <p style="color:#94A3B8; margin-top:8px;">Meeting link not yet available.</p>
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
Load Quiz (if one exists for this session)
Shows attempt count, pass/fail, and whether
attendance was granted.
========================== */

async function loadQuizAction() {

  const { data: quiz } = await client
    .from("quizzes")
    .select("*, quiz_questions(points)")
    .eq("session_id", sessionId)
    .eq("status", "Published")
    .maybeSingle();

  const box = document.getElementById("quizAction");

  if (!quiz) {
    box.innerHTML = "";
    return;
  }

  const { data: { user } } = await client.auth.getUser();
  const { data: student } = await client
    .from("students")
    .select("student_id")
    .eq("auth_user_id", user.id)
    .single();

  const { data: submissions } = await client
    .from("quiz_submissions")
    .select("score, attempt_number")
    .eq("quiz_id", quiz.quiz_id)
    .eq("student_id", student.student_id)
    .order("attempt_number", { ascending: false });

  const totalPoints = (quiz.quiz_questions || []).reduce((s, q) => s + q.points, 0);
  const latest = submissions?.[0];

  const { data: attendance } = await client
    .from("session_attendance")
    .select("attendance_id")
    .eq("session_id", sessionId)
    .eq("student_id", student.student_id)
    .maybeSingle();

  const timing = getSessionTiming(currentSession);
  const withinWindow = timing.windowEnd ? new Date() <= timing.windowEnd : false;

  if (!latest) {

    const note = withinWindow
      ? `Score 70%+ within this window to also mark your attendance.`
      : `The attendance window has passed — this will count as a quiz only.`;

    box.innerHTML = `
      <div class="table-card" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
        <div>
          <strong>${quiz.title}</strong>
          <p style="color:#6B7280; margin-top:4px;">${note}</p>
        </div>
        <a href="take-quiz.html?quiz=${quiz.quiz_id}" class="view-btn" style="text-decoration:none;">
          <i class="fa-solid fa-pen"></i> Take Quiz
        </a>
      </div>
    `;
    return;
  }

  const percent = totalPoints > 0 ? Math.round((latest.score / totalPoints) * 100) : 0;
  const passed = percent >= 70;
  const canRetake = submissions.length === 1 && !passed;

  box.innerHTML = `
    <div class="table-card" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
      <div>
        <strong>${quiz.title}</strong>
        <p style="color:#6B7280; margin-top:4px;">
          Attempt ${latest.attempt_number}: ${latest.score}/${totalPoints} (${percent}%)
          ${attendance ? " — Attendance marked ✅" : ""}
        </p>
      </div>
      ${canRetake
        ? `<a href="take-quiz.html?quiz=${quiz.quiz_id}" class="view-btn" style="text-decoration:none;"><i class="fa-solid fa-rotate-right"></i> Retake</a>`
        : `<span class="status ${passed ? "active" : "pending"}">${passed ? "Passed" : "Completed"}</span>`
      }
    </div>
  `;

}

/* ==========================
Start
========================== */

loadSession();
loadMaterials();
loadQuizAction();