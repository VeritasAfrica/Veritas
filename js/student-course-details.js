/*
=========================================
Purpose Institute STUDENT COURSE DETAILS
=========================================
*/

const params = new URLSearchParams(window.location.search);
const courseId = params.get("id");

if (!courseId) {
  alert("Course not found.");
  window.location.href = "student-courses.html";
}

/* ==========================
Load Course
========================== */

async function loadCourse() {

  const { data: course, error } = await client
    .from("courses")
    .select("*")
    .eq("course_id", courseId)
    .single();

  if (error || !course) {
    console.error(error);
    alert("Course not found.");
    window.location.href = "student-courses.html";
    return;
  }

  document.getElementById("courseTitle").textContent = course.course_title;
  document.getElementById("courseCode").textContent = course.course_code;
  document.getElementById("description").textContent = course.description || "No description provided.";
  document.getElementById("courseStatus").textContent = course.status;

  document.getElementById("department").textContent = "Loading...";

  const { data: departments } = await client
    .from("course_departments")
    .select("department")
    .eq("course_id", courseId);

  const deptList = (departments || []).map(d => d.department);
  document.getElementById("department").textContent =
    deptList.length === 3 ? "All" : (deptList.join(", ") || "None set");

}

/* ==========================
Load Sessions
========================== */

let sessionIds = [];

async function loadSessions() {

  const { data: sessions, error } = await client
    .from("course_sessions")
    .select("*")
    .eq("course_id", courseId)
    .order("week", { ascending: true })
    .order("session_number", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("sessionCount").textContent = sessions.length;
  sessionIds = sessions.map(s => s.session_id);

  const table = document.getElementById("sessionTable");
  table.innerHTML = "";

  if (sessions.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px;">
          No sessions released yet.
        </td>
      </tr>
    `;
  } else {

    sessions.forEach(session => {

      const dateLabel = session.scheduled_date
        ? new Date(session.scheduled_date).toLocaleDateString()
        : "-";

      table.innerHTML += `
        <tr>
          <td>Week ${session.week}</td>
          <td>${session.title}</td>
          <td>${session.session_type}</td>
          <td>${dateLabel}</td>
          <td>
            <button class="view-btn" onclick="openSession(${session.session_id})">
              Open
            </button>
          </td>
        </tr>
      `;

    });

  }

  // Materials are linked to sessions, not directly to courses,
  // so the count is fetched after we know this course's session IDs.
  loadMaterials();

}

/* ==========================
Load Materials Count
========================== */

async function loadMaterials() {

  if (!sessionIds.length) {
    document.getElementById("materialCount").textContent = 0;
    return;
  }

  const { count, error } = await client
    .from("session_materials")
    .select("*", { count: "exact", head: true })
    .in("session_id", sessionIds);

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("materialCount").textContent = count || 0;

}

/* ==========================
Load Announcements
========================== */

async function loadAnnouncements() {

  document.getElementById("viewAllAnnouncements").href =
    `student-announcements.html?course=${courseId}`;

  const { data: announcements, error } = await client
    .from("course_announcements")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("announcementCount").textContent = announcements.length;

  const list = document.getElementById("announcementList");
  list.innerHTML = "";

  if (announcements.length === 0) {
    list.innerHTML = `<p style="color:#6B7280;">No announcements yet.</p>`;
    return;
  }

  announcements.forEach(a => {
    const date = new Date(a.created_at).toLocaleDateString();

    list.innerHTML += `
      <div style="padding:16px 0;border-bottom:1px solid #EEF2F7;">
        <strong>${a.title}</strong>
        <p style="color:#6B7280;margin-top:6px;">${a.message}</p>
        <p style="color:#94A3B8;font-size:13px;margin-top:6px;">${date}</p>
      </div>
    `;
  });

}

/* ==========================
Open Session
========================== */

function openSession(id) {
  window.location.href = `student-material-view.html?id=${id}`;
}

/* ==========================
Start
========================== */

loadCourse();
loadSessions();
loadAnnouncements();