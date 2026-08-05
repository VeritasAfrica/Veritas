/*
=========================================
VALMS STUDENT COURSES
=========================================
*/

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");
const logoutBtn = document.getElementById("logoutBtn");
const search = document.getElementById("searchCourse");

/* ==========================
Mobile Menu
========================== */

menuBtn.addEventListener("click", () => {
  sidebar.classList.add("show");
  overlay.classList.add("show");
});

overlay.addEventListener("click", () => {
  sidebar.classList.remove("show");
  overlay.classList.remove("show");
});

/* ==========================
Logout
========================== */

logoutBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  await client.auth.signOut();
  window.location.href = "login.html";
});

/* ==========================
Load Courses
========================== */

async function loadCourses() {

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: profile } = await client
    .from("students")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (profile) {
    const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
    document.getElementById("topAvatar").textContent = initials;
  }

  /*
  Temporary:
  Shows all published courses.
  Later:
  Replace with enrollments/course_registration table.
  */

  const { data: courses, error } = await client
    .from("courses")
    .select("*")
    .eq("status", "Published")
    .order("course_code");

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("courseCount").textContent = courses.length;

  /* ==========================
  Sessions
  ========================== */

  const { data: sessions } = await client
    .from("course_sessions")
    .select("*");

  document.getElementById("sessionCount").textContent = sessions ? sessions.length : 0;

  /* ==========================
  Materials
  ========================== */

  const { data: materials } = await client
    .from("session_materials")
    .select("*");

  document.getElementById("materialCount").textContent = materials ? materials.length : 0;

  /* ==========================
  Announcements
  ========================== */

  const { data: announcements } = await client
    .from("course_announcements")
    .select("*");

  document.getElementById("announcementCount").textContent = announcements ? announcements.length : 0;

  /* ==========================
  Table
  ========================== */

  const table = document.getElementById("courseTable");
  table.innerHTML = "";

  courses.forEach(course => {
    table.innerHTML += `
      <tr>
        <td><strong>${course.course_code}</strong></td>
        <td>${course.course_title}</td>
        <td>${course.department ?? "-"}</td>
        <td><span class="status active">${course.status}</span></td>
        <td>
          <button class="view-btn" onclick="openCourse(${course.course_id})">
            Open
          </button>
        </td>
      </tr>
    `;
  });

}

/* ==========================
Search
========================== */

search.addEventListener("keyup", () => {
  const keyword = search.value.toLowerCase();

  document.querySelectorAll("#courseTable tr").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(keyword) ? "" : "none";
  });
});

/* ==========================
Open Course
========================== */

function openCourse(id) {
  window.location.href = `student-course-details.html?id=${id}`;
}

/* ==========================
Start
========================== */

loadCourses();