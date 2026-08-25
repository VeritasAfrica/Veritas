/*
=========================================
Purpose Institute MY ATTENDANCE
Sourced from session_attendance — auto-
marked when a student passes their quiz.
=========================================
*/

async function loadAttendance() {

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: student } = await client
    .from("students")
    .select("student_id")
    .eq("auth_user_id", user.id)
    .single();

  const studentId = student.student_id;

  // Every session from a Published course that has already started —
  // these are the sessions attendance was actually possible for.
  const { data: allSessions, error: sessionsError } = await client
    .from("course_sessions")
    .select(`
      session_id, title, scheduled_date, start_time,
      courses(course_id, course_code, course_title, status)
    `);

  if (sessionsError) {
    console.error(sessionsError);
    return;
  }

  const now = new Date();

  const heldSessions = (allSessions || []).filter(s => {
    if (s.courses?.status !== "Published") return false;
    if (!s.scheduled_date || !s.start_time) return false;
    return new Date(`${s.scheduled_date}T${s.start_time}`) <= now;
  });

  // This student's own attendance records
  const { data: myRecords, error: recordsError } = await client
    .from("session_attendance")
    .select("session_id, marked_at")
    .eq("student_id", studentId)
    .order("marked_at", { ascending: false });

  if (recordsError) {
    console.error(recordsError);
    return;
  }

  const attendedSessionIds = new Set(myRecords.map(r => r.session_id));

  /* ==========================
  Per-Course Breakdown
  ========================== */

  const byCourse = {};

  heldSessions.forEach(s => {
    const course = s.courses;
    if (!course) return;

    if (!byCourse[course.course_id]) {
      byCourse[course.course_id] = { code: course.course_code, held: 0, attended: 0 };
    }

    byCourse[course.course_id].held++;

    if (attendedSessionIds.has(s.session_id)) {
      byCourse[course.course_id].attended++;
    }
  });

  const courseTable = document.getElementById("courseAttendanceTable");
  courseTable.innerHTML = "";

  const courseRows = Object.values(byCourse);

  if (courseRows.length === 0) {
    courseTable.innerHTML = `
      <tr><td colspan="4" style="text-align:center; padding:30px;">No attendance data yet.</td></tr>
    `;
  } else {
    courseRows.forEach(c => {
      const rate = c.held > 0 ? Math.round((c.attended / c.held) * 100) : 0;
      courseTable.innerHTML += `
        <tr>
          <td><strong>${c.code}</strong></td>
          <td>${c.attended}</td>
          <td>${c.held}</td>
          <td><span class="status ${rate >= 75 ? "active" : "pending"}">${rate}%</span></td>
        </tr>
      `;
    });
  }

  /* ==========================
  Overall Stats
  ========================== */

  const totalHeld = heldSessions.length;
  const totalAttended = heldSessions.filter(s => attendedSessionIds.has(s.session_id)).length;
  const overallRate = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;

  document.getElementById("overallRate").textContent = `${overallRate}%`;
  document.getElementById("attendedCount").textContent = totalAttended;
  document.getElementById("missedCount").textContent = totalHeld - totalAttended;

  /* ==========================
  Attendance Log
  ========================== */

  const logTable = document.getElementById("logTable");
  logTable.innerHTML = "";

  if (myRecords.length === 0) {
    logTable.innerHTML = `
      <tr><td colspan="3" style="text-align:center; padding:30px;">No attendance marked yet.</td></tr>
    `;
    return;
  }

  const sessionsById = {};
  allSessions.forEach(s => { sessionsById[s.session_id] = s; });

  myRecords.forEach(r => {
    const session = sessionsById[r.session_id];
    const course = session?.courses;

    logTable.innerHTML += `
      <tr>
        <td>${course ? course.course_code : "-"}</td>
        <td>${session?.title || "-"}</td>
        <td>${new Date(r.marked_at).toLocaleString()}</td>
      </tr>
    `;
  });

}

loadAttendance();