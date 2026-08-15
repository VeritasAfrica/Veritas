/*
=========================================
Purpose Institute MARK ATTENDANCE
=========================================
*/

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

const statusIcon = document.getElementById("statusIcon");
const statusTitle = document.getElementById("statusTitle");
const statusMessage = document.getElementById("statusMessage");
const markBtn = document.getElementById("markBtn");

let attendanceId = null;
let studentId = null;

function showState(icon, color, title, message, showButton = false) {
  statusIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`;
  statusIcon.style.background = color;
  statusTitle.textContent = title;
  statusMessage.textContent = message;
  markBtn.style.display = showButton ? "inline-flex" : "none";
}

async function checkCode() {

  if (!code) {
    showState("fa-circle-xmark", "#EF4444", "Invalid Link", "No attendance code was provided.");
    return;
  }

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    showState("fa-circle-xmark", "#EF4444", "Please Log In", "You need to be logged in to mark attendance.");
    return;
  }

  const { data: student } = await client
    .from("students")
    .select("student_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!student) {
    showState("fa-circle-xmark", "#EF4444", "Account Not Found", "Your student record could not be found.");
    return;
  }

  studentId = student.student_id;

  const { data: attendanceSession, error } = await client
    .from("attendance_sessions")
    .select("attendance_id, closes_at, status, course_sessions(title)")
    .eq("attendance_code", code)
    .single();

  if (error || !attendanceSession) {
    showState("fa-circle-xmark", "#EF4444", "Invalid Code", "This attendance code doesn't exist.");
    return;
  }

  if (attendanceSession.status !== "Open" || new Date(attendanceSession.closes_at) < new Date()) {
    showState("fa-clock", "#F59E0B", "Attendance Closed", "This attendance window has closed. Contact your lecturer if you believe this is a mistake.");
    return;
  }

  attendanceId = attendanceSession.attendance_id;

  // Check if already marked
  const { data: existing } = await client
    .from("attendance_records")
    .select("record_id")
    .eq("attendance_id", attendanceId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    showState("fa-circle-check", "#34C759", "Already Marked", `You've already been marked present for "${attendanceSession.course_sessions.title}".`);
    return;
  }

  showState("fa-calendar-check", "#3B82F6", attendanceSession.course_sessions.title, "Tap below to confirm your attendance for this session.", true);

}

markBtn.addEventListener("click", async () => {

  markBtn.disabled = true;
  markBtn.textContent = "Marking...";

  const { error } = await client
    .from("attendance_records")
    .insert({ attendance_id: attendanceId, student_id: studentId });

  if (error) {
    showState("fa-circle-xmark", "#EF4444", "Something Went Wrong", error.message);
    return;
  }

  showState("fa-circle-check", "#34C759", "Attendance Marked!", "You're all set. You can close this page now.");

});

checkCode();