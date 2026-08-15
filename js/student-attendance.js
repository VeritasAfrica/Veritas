/*
=========================================
Purpose Institute MY ATTENDANCE
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

  // All attendance windows ever opened, across Published courses —
  // this is the "sessions held" side of the rate calculation.
  const { data: allWindows, error: windowsError } = await client
    .from("attendance_sessions")
    .select(`
      attendance_id,
      course_sessions(
        session_id,
        title,
        courses(course_id, course_code, course_title, status)
      )
    `);

  if (windowsError) {
    console.error(windowsError);
    return;
  }

  const heldWindows = allWindows.filter(w => w.course_sessions?.courses?.status === "Published");

  // This student's own attendance records — the "attended" side.
  const { data: myRecords, error: recordsError } = await client
    .from("attendance_records")
    .select(`
      attendance_id,
      marked_at,
      attendance_sessions(
        course_sessions(
          title,
          courses(course_id, course_code, course_title)
        )
      )
    `)
    .eq("student_id", studentId)
    .order("marked_at", { ascending: false });

  if (recordsError) {
    console.error(recordsError);
    return;
  }

  const attendedIds = new Set(myRecords.map(r => r.attendance_id));

  /* ==========================
  Per-Course Breakdown
  ========================== */

  const byCourse = {};

  heldWindows.forEach(w => {
    const course = w.course_sessions.courses;
    if (!course) return;

    if (!byCourse[course.course_id]) {
      byCourse[course.course_id] = {
        code: course.course_code,
        held: 0,
        attended: 0
      };
    }

    byCourse[course.course_id].held++;

    if (attendedIds.has(w.attendance_id)) {
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

  const totalHeld = heldWindows.length;
  const totalAttended = heldWindows.filter(w => attendedIds.has(w.attendance_id)).length;
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

  myRecords.forEach(r => {
    const course = r.attendance_sessions?.course_sessions?.courses;
    const sessionTitle = r.attendance_sessions?.course_sessions?.title || "-";

    logTable.innerHTML += `
      <tr>
        <td>${course ? course.course_code : "-"}</td>
        <td>${sessionTitle}</td>
        <td>${new Date(r.marked_at).toLocaleString()}</td>
      </tr>
    `;
  });

}

loadAttendance();