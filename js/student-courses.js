/*
=========================================
Purpose Institute STUDENT COURSES
=========================================
*/

const search = document.getElementById("searchCourse");

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
    .select("department")
    .eq("auth_user_id", user.id)
    .single();

  const studentDepartment = profile?.department || "All";

  /*
  Temporary:
  Shows all published courses.
  Later:
  Replace with enrollments/course_registration table.
  */

  const { data: allPublished, error } = await client
    .from("courses")
    .select("*, course_departments(department)")
    .eq("status", "Published")
    .order("course_code");

  if (error) {
    console.error(error);
    return;
  }

  // A course is visible if: the student's own department is "All"
  // (current cohort, not segmented yet), or the course has no
  // department tags set (legacy/untagged courses stay visible),
  // or the course is tagged for the student's specific department.
  const courses = allPublished.filter(course => {
    const tags = course.course_departments || [];
    if (studentDepartment === "All") return true;
    if (tags.length === 0) return true;
    return tags.some(t => t.department === studentDepartment);
  });

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

    const deptTags = course.course_departments || [];
    const deptLabel = deptTags.length === 3
      ? "All"
      : deptTags.map(d => d.department).join(", ") || "-";

    table.innerHTML += `
      <tr>
        <td><strong>${course.course_code}</strong></td>
        <td>${course.course_title}</td>
        <td>${deptLabel}</td>
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