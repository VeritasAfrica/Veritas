/*
=========================================
Purpose Institute CREATE SESSION
=========================================
*/

const params = new URLSearchParams(window.location.search);
const courseId = params.get("course_id");

if (!courseId) {
  alert("No course selected.");
  window.location.href = "courses.html";
}

const form = document.getElementById("sessionForm");
const message = document.getElementById("message");
const saveBtn = document.getElementById("saveSession");

/* ==========================
Save Session
========================== */

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  message.innerHTML = "";
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  // Auto-calculate the next session_number for this course
  const { count } = await client
    .from("course_sessions")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  const nextSessionNumber = (count || 0) + 1;

  const session = {
    course_id: courseId,
    week: parseInt(document.getElementById("week").value),
    session_number: nextSessionNumber,
    title: document.getElementById("title").value.trim(),
    session_type: document.getElementById("type").value,
    scheduled_date: document.getElementById("scheduledDate").value,
    start_time: document.getElementById("startTime").value,
    end_time: document.getElementById("endTime").value || null,
    meeting_url: document.getElementById("meetingUrl").value.trim() || null,
    video_url: document.getElementById("videoUrl").value.trim() || null,
    description: document.getElementById("description").value.trim()
  };

  const { error } = await client
    .from("course_sessions")
    .insert(session);

  saveBtn.disabled = false;
  saveBtn.textContent = "Save Session";

  if (error) {
    message.style.color = "#EF4444";
    message.innerHTML = error.message;
    return;
  }

  message.style.color = "#16A34A";
  message.innerHTML = "Session created successfully.";

  setTimeout(() => {
    window.location.href = `course-details.html?id=${courseId}`;
  }, 800);

});