/*
=========================================
Purpose Institute ATTENDANCE (ADMIN OVERVIEW)
=========================================
*/

let allWindows = [];

async function loadAttendance() {

  const { data, error } = await client
    .from("attendance_sessions")
    .select(`
      *,
      attendance_records(count),
      course_sessions(
        session_id,
        title,
        courses(course_id, course_code, course_title)
      )
    `)
    .order("opened_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  allWindows = data;
  populateCourseFilter(data);
  renderAttendance(data);

}

function renderAttendance(windows) {

  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  if (windows.length === 0) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px;">No attendance windows opened yet.</td></tr>`;
  } else {

    windows.forEach(w => {

      const course = w.course_sessions?.courses;
      const recordCount = w.attendance_records?.[0]?.count || 0;
      const isLive = w.status === "Open" && new Date(w.closes_at) > new Date();
      const statusLabel = isLive ? "Live" : (w.status === "Open" ? "Expired" : "Closed");
      const statusClass = isLive ? "active" : "pending";

      table.innerHTML += `
        <tr>
          <td><strong>${course ? course.course_code : "-"}</strong></td>
          <td>${w.course_sessions?.title || "-"}</td>
          <td>${new Date(w.opened_at).toLocaleString()}</td>
          <td><span class="status ${statusClass}">${statusLabel}</span></td>
          <td>${recordCount}</td>
          <td>
            <button class="view-btn" onclick="window.location.href='session-details.html?id=${w.course_sessions?.session_id}'">
              View Session
            </button>
          </td>
        </tr>
      `;

    });

  }

  const totalRecords = windows.reduce((sum, w) => sum + (w.attendance_records?.[0]?.count || 0), 0);
  const liveCount = windows.filter(w => w.status === "Open" && new Date(w.closes_at) > new Date()).length;

  document.getElementById("totalSessions").textContent = windows.length;
  document.getElementById("totalRecords").textContent = totalRecords;
  document.getElementById("liveCount").textContent = liveCount;

}

function populateCourseFilter(windows) {

  const filterCourse = document.getElementById("filterCourse");
  const seen = new Set();

  windows.forEach(w => {
    const course = w.course_sessions?.courses;
    if (course && !seen.has(course.course_id)) {
      seen.add(course.course_id);
      filterCourse.innerHTML += `<option value="${course.course_id}">${course.course_code}</option>`;
    }
  });

}

function applyFilters() {

  const keyword = document.getElementById("searchAttendance").value.toLowerCase();
  const courseId = document.getElementById("filterCourse").value;

  const filtered = allWindows.filter(w => {
    const course = w.course_sessions?.courses;
    const matchesKeyword =
      (course?.course_code || "").toLowerCase().includes(keyword) ||
      (w.course_sessions?.title || "").toLowerCase().includes(keyword);
    const matchesCourse = !courseId || course?.course_id == courseId;
    return matchesKeyword && matchesCourse;
  });

  renderAttendance(filtered);

}

document.getElementById("searchAttendance").addEventListener("keyup", applyFilters);
document.getElementById("filterCourse").addEventListener("change", applyFilters);

loadAttendance();