/*
=========================================
Purpose Institute CREATE / EDIT COURSE
=========================================
*/

const form = document.getElementById("courseForm");
const message = document.getElementById("message");
const saveBtn = document.getElementById("saveCourse");
const pageTitle = document.getElementById("pageTitle");

const params = new URLSearchParams(window.location.search);
const courseId = params.get("id");


/* ==========================
Edit Mode
========================== */

if (courseId) {
  pageTitle.textContent = "Edit Course";
  saveBtn.textContent = "Update Course";
  loadCourse();
}

/* ==========================
Load Course
========================== */

async function loadCourse() {

  const { data, error } = await client
    .from("courses")
    .select("*")
    .eq("course_id", courseId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("courseCode").value = data.course_code;
  document.getElementById("courseTitle").value = data.course_title;
  document.getElementById("department").value = data.department;
  document.getElementById("description").value = data.description || "";
  document.getElementById("status").value = data.status;

}

/* ==========================
Save
========================== */

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  message.innerHTML = "";
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const course = {
    course_code: document.getElementById("courseCode").value.trim(),
    course_title: document.getElementById("courseTitle").value.trim(),
    department: document.getElementById("department").value.trim() || null,
    description: document.getElementById("description").value.trim(),
    status: document.getElementById("status").value
  };

  let error;

  if (courseId) {
    ({ error } = await client
      .from("courses")
      .update(course)
      .eq("course_id", courseId));
  } else {
    ({ error } = await client
      .from("courses")
      .insert(course));
  }

  saveBtn.disabled = false;
  saveBtn.textContent = courseId ? "Update Course" : "Save Course";

  if (error) {
    message.style.color = "#EF4444";
    message.innerHTML = error.message;
    return;
  }

  message.style.color = "#16A34A";
  message.innerHTML = "Course saved successfully.";

  setTimeout(() => {
    window.location.href = "courses.html";
  }, 800);

});