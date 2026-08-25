/*
=========================================
Purpose Institute ATTENDANCE (ADMIN OVERVIEW)
Auto-marked via quiz — no manual windows,
so this is now grouped by session instead.
=========================================
*/

let allSessions = [];

async function loadAttendance() {

  const { data, error } = await client
    .from("course_sessions")
    .select(`
      session_id, title, scheduled_date, start_time,
      courses(course_id, course_code, course_title),
      session_attendance(count)
    `)
    .order("scheduled_date", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Only show sessions that actually have at least one attendance record
  allSessions = (data || []).filter(s => (s.session_attendance?.[0]?.count || 0) > 0);

  populateCourseFilter(allSessions);
  renderAttendance(allSessions);

}

function renderAttendance(sessions) {

  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  if (sessions.length === 0) {
    table.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">No attendance marked yet.</td></tr>`;
  } else {

    sessions.forEach(s => {

      const count = s.session_attendance?.[0]?.count || 0;
      const dateLabel = s.scheduled_date
        ? `${new Date(s.scheduled_date).toLocaleDateString()}${s.start_time ? ` at ${s.start_time.slice(0, 5)}` : ""}`
        : "-";

      table.innerHTML += `
        <tr>
          <td><strong>${s.courses?.course_code || "-"}</strong></td>
          <td>${s.title}</td>
          <td>${dateLabel}</td>
          <td>${count}</td>
          <td>
            <button class="view-btn" onclick="window.location.href='session-details.html?id=${s.session_id}'">
              View Session
            </button>
          </td>
        </tr>
      `;

    });

  }

  document.getElementById("totalSessions").textContent = sessions.length;
  document.getElementById("totalRecords").textContent =
    sessions.reduce((sum, s) => sum + (s.session_attendance?.[0]?.count || 0), 0);

}

function populateCourseFilter(sessions) {

  const filterCourse = document.getElementById("filterCourse");
  const seen = new Set();

  sessions.forEach(s => {
    const course = s.courses;
    if (course && !seen.has(course.course_id)) {
      seen.add(course.course_id);
      filterCourse.innerHTML += `<option value="${course.course_id}">${course.course_code}</option>`;
    }
  });

}

function applyFilters() {

  const keyword = document.getElementById("searchAttendance").value.toLowerCase();
  const courseId = document.getElementById("filterCourse").value;

  const filtered = allSessions.filter(s => {
    const matchesKeyword =
      (s.courses?.course_code || "").toLowerCase().includes(keyword) ||
      (s.title || "").toLowerCase().includes(keyword);
    const matchesCourse = !courseId || s.courses?.course_id == courseId;
    return matchesKeyword && matchesCourse;
  });

  renderAttendance(filtered);

}

document.getElementById("searchAttendance").addEventListener("keyup", applyFilters);
document.getElementById("filterCourse").addEventListener("change", applyFilters);

loadAttendance();