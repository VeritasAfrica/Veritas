/*
=========================================
Purpose Institute COURSE DETAILS
=========================================
*/

const params = new URLSearchParams(window.location.search);
const courseId = params.get("id");

if (!courseId) {
  alert("Course not found.");
  window.location.href = "courses.html";
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
    window.location.href = "courses.html";
    return;
  }

  document.getElementById("courseTitle").textContent = course.course_title;
  document.getElementById("courseCode").textContent = course.course_code;
  document.getElementById("courseStatus").textContent = course.status;
  document.getElementById("description").textContent = course.description || "No description provided.";

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

async function loadSessions() {

  const { data: sessions = [], error } = await client
    .from("course_sessions")
    .select("*")
    .eq("course_id", courseId)
    .order("week", { ascending: true })
    .order("session_number", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const table = document.getElementById("sessionTable");
  table.innerHTML = "";

  document.getElementById("sessionCount").textContent = sessions.length;

  sessions.forEach(session => {

    const statusClass = session.status === "Published" ? "active" : "pending";

    table.innerHTML += `
      <tr>
        <td>Week ${session.week}</td>
        <td>${session.title}</td>
        <td>${session.session_type}</td>
        <td><span class="status ${statusClass}">${session.status}</span></td>
        <td>
          <button class="view-btn" onclick="viewSession(${session.session_id})">View</button>
          <button class="delete-btn" onclick="deleteSession(${session.session_id})">Delete</button>
        </td>
      </tr>
    `;

  });

  // Load material count across all sessions for this course
  loadMaterialCount(sessions.map(s => s.session_id));

}

/* ==========================
Material Count
========================== */

async function loadMaterialCount(sessionIds) {

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

  const { data: announcements = [], error } = await client
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
    list.innerHTML = `<p style="color:#64748B;">No announcements yet.</p>`;
    return;
  }

  announcements.forEach(a => {
    const date = new Date(a.created_at).toLocaleDateString();

    list.innerHTML += `
      <div style="padding:16px 0;border-bottom:1px solid #EEF2F7;">
        <strong>${a.title}</strong>
        <p style="color:#64748B;margin-top:6px;">${a.message}</p>
        <p style="color:#94A3B8;font-size:13px;margin-top:6px;">${date}</p>
      </div>
    `;
  });

}

/* ==========================
New Session
========================== */

document.getElementById("newSession").addEventListener("click", () => {
  window.location.href = `create-session.html?course_id=${courseId}`;
});

function viewSession(sessionId) {
  window.location.href = `session-details.html?id=${sessionId}`;
}

async function deleteSession(sessionId) {

  const confirmed = confirm("Delete this session? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await client
    .from("course_sessions")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    alert(error.message);
    return;
  }

  loadSessions();

}

/* ==========================
New Announcement
========================== */

document.getElementById("newAnnouncement").addEventListener("click", async () => {

  const title = prompt("Announcement title:");
  if (!title) return;

  const message = prompt("Announcement message:");
  if (!message) return;

  const { error } = await client
    .from("course_announcements")
    .insert({
      course_id: courseId,
      title,
      message
    });

  if (error) {
    alert(error.message);
    return;
  }

  loadAnnouncements();

});

/* ==========================
Edit / Delete Course
========================== */

document.getElementById("editCourse").addEventListener("click", () => {
  window.location.href = `create-course.html?id=${courseId}`;
});

document.getElementById("deleteCourse").addEventListener("click", async () => {

  const confirmed = confirm("Delete this course and all its sessions? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await client
    .from("courses")
    .delete()
    .eq("course_id", courseId);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Course deleted.");
  window.location.href = "courses.html";

});

/* ==========================
Start
========================== */

loadCourse();
loadSessions();
loadAnnouncements();