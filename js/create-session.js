/*
=========================================
Purpose Institute CREATE / EDIT SESSION
=========================================
*/

const params = new URLSearchParams(window.location.search);
let courseId = params.get("course_id");
const sessionId = params.get("id");

if (!courseId && !sessionId) {
  alert("No course or session specified.");
  window.location.href = "courses.html";
}

const form = document.getElementById("sessionForm");
const message = document.getElementById("message");
const saveBtn = document.getElementById("saveSession");

/* ==========================
Edit Mode — load existing session
========================== */

if (sessionId) {
  loadSession();
}

async function loadSession() {

  const { data, error } = await client
    .from("course_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error || !data) {
    alert("Session not found.");
    window.location.href = "courses.html";
    return;
  }

  // In edit mode, the course comes from the session itself
  courseId = data.course_id;

  document.querySelector(".topbar h2").textContent = "Edit Session";
  saveBtn.textContent = "Update Session";

  document.getElementById("week").value = data.week;
  document.getElementById("title").value = data.title;
  document.getElementById("type").value = data.session_type;
  document.getElementById("scheduledDate").value = data.scheduled_date || "";
  document.getElementById("startTime").value = data.start_time || "";
  document.getElementById("endTime").value = data.end_time || "";
  document.getElementById("meetingUrl").value = data.meeting_url || "";
  document.getElementById("videoUrl").value = data.video_url || "";
  document.getElementById("description").value = data.description || "";

}

/* ==========================
Save Session (Create or Update)
========================== */

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  message.innerHTML = "";
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const session = {
    week: parseInt(document.getElementById("week").value),
    title: document.getElementById("title").value.trim(),
    session_type: document.getElementById("type").value,
    scheduled_date: document.getElementById("scheduledDate").value,
    start_time: document.getElementById("startTime").value,
    end_time: document.getElementById("endTime").value || null,
    meeting_url: document.getElementById("meetingUrl").value.trim() || null,
    video_url: document.getElementById("videoUrl").value.trim() || null,
    description: document.getElementById("description").value.trim()
  };

  let error;

  if (sessionId) {

    // Edit mode — week/session_number stay untouched, everything else updates
    ({ error } = await client
      .from("course_sessions")
      .update(session)
      .eq("session_id", sessionId));

  } else {

    // Create mode — auto-calculate the next session_number for this course
    const { count } = await client
      .from("course_sessions")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);

    session.course_id = courseId;
    session.session_number = (count || 0) + 1;

    ({ error } = await client
      .from("course_sessions")
      .insert(session));

  }

  saveBtn.disabled = false;
  saveBtn.textContent = sessionId ? "Update Session" : "Save Session";

  if (error) {
    message.style.color = "#EF4444";
    message.innerHTML = error.message;
    return;
  }

  message.style.color = "#16A34A";
  message.innerHTML = sessionId ? "Session updated successfully." : "Session created successfully.";

  setTimeout(() => {
    window.location.href = sessionId
      ? `session-details.html?id=${sessionId}`
      : `course-details.html?id=${courseId}`;
  }, 800);

});