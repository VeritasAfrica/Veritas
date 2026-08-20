/*
=========================================
Purpose Institute COURSES (LIST PAGE)
=========================================
*/

/* ==========================
Create Course Button
========================== */

const createCourseBtn = document.getElementById("createCourseBtn");

if (createCourseBtn) {
  createCourseBtn.addEventListener("click", () => {
    window.location.href = "create-course.html";
  });
}

/* ==========================
Edit / Delete Course
========================== */

function editCourse(id) {
  window.location.href = `create-course.html?id=${id}`;
}

function viewCourse(id) {
  window.location.href = `course-details.html?id=${id}`;
}

async function deleteCourse(id) {

  const confirmed = confirm("Delete this course? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await client
    .from("courses")
    .delete()
    .eq("course_id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadCourses();

}

/* ==========================
Load Courses
========================== */

let allCourses = [];

async function loadCourses() {

  const { data: courses = [], error } = await client
    .from("courses")
    .select("*, course_departments(department)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  allCourses = courses || [];
  renderCourses(allCourses);

}

/* ==========================
Render Courses + Stats
========================== */

function renderCourses(courses) {

  const table = document.getElementById("courseTable");
  table.innerHTML = "";

  let published = 0;
  let draft = 0;
  let archived = 0;

  courses.forEach(course => {

    if (course.status === "Published") published++;
    else if (course.status === "Draft") draft++;
    else if (course.status === "Archived") archived++;

    const statusClass =
      course.status === "Published" ? "active" :
      course.status === "Archived" ? "pending" : "pending";

    const createdDate = course.created_at
      ? new Date(course.created_at).toLocaleDateString()
      : "-";

    const deptTags = course.course_departments || [];
    const deptLabel = deptTags.length === 3
      ? "All"
      : deptTags.map(d => d.department).join(", ") || "-";

    table.innerHTML += `
      <tr>
        <td><strong>${course.course_code}</strong></td>
        <td>${course.course_title}</td>
        <td>${deptLabel}</td>
        <td><span class="status ${statusClass}">${course.status}</span></td>
        <td>${createdDate}</td>
        <td>
          <button class="view-btn" onclick="viewCourse(${course.course_id})">View</button>
          <button class="assign-btn" onclick="editCourse(${course.course_id})">Edit</button>
          <button class="delete-btn" onclick="deleteCourse(${course.course_id})">Delete</button>
        </td>
      </tr>
    `;

  });

  document.getElementById("totalCourses").textContent = courses.length;
  document.getElementById("publishedCourses").textContent = published;
  document.getElementById("draftCourses").textContent = draft;
  document.getElementById("archivedCourses").textContent = archived;

}

/* ==========================
Search
========================== */

const searchInput = document.getElementById("searchCourse");

if (searchInput) {
  searchInput.addEventListener("keyup", function () {
    const value = this.value.toLowerCase();

    const filtered = allCourses.filter(course =>
      course.course_code.toLowerCase().includes(value) ||
      course.course_title.toLowerCase().includes(value)
    );

    renderCourses(filtered);
  });
}

/* ==========================
Start
========================== */

loadCourses();