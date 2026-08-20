/*
=========================================
Purpose Institute CREATE / EDIT COURSE
=========================================
*/

const form = document.getElementById("courseForm");
const message = document.getElementById("message");
const saveBtn = document.getElementById("saveCourse");

const params = new URLSearchParams(window.location.search);
const courseId = params.get("id");

/* ==========================
Edit Mode
(waits for the shell to inject the topbar
before trying to update its title, since the
shell's heading has no id to target directly)
========================== */

document.addEventListener("adminShellReady", () => {
  if (courseId) {
    document.querySelector(".topbar h2").textContent = "Edit Course";
    saveBtn.textContent = "Update Course";
  }
});

if (courseId) {
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
  document.getElementById("description").value = data.description || "";
  document.getElementById("status").value = data.status;

  // Load which departments are currently checked for this course
  const { data: departments } = await client
    .from("course_departments")
    .select("department")
    .eq("course_id", courseId);

  (departments || []).forEach(d => {
    const checkbox = document.querySelector(`.dept-input[value="${d.department}"]`);
    if (checkbox) checkbox.checked = true;
  });

}

/* ==========================
Save
========================== */

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  message.innerHTML = "";

  const selectedDepartments = Array.from(document.querySelectorAll(".dept-input:checked"))
    .map(cb => cb.value);

  if (selectedDepartments.length === 0) {
    message.style.color = "#EF4444";
    message.innerHTML = "Select at least one department.";
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const course = {
    course_code: document.getElementById("courseCode").value.trim(),
    course_title: document.getElementById("courseTitle").value.trim(),
    description: document.getElementById("description").value.trim(),
    status: document.getElementById("status").value
  };

  let error;
  let savedCourseId = courseId;

  if (courseId) {

    ({ error } = await client
      .from("courses")
      .update(course)
      .eq("course_id", courseId));

  } else {

    const { data, error: insertError } = await client
      .from("courses")
      .insert(course)
      .select()
      .single();

    error = insertError;
    if (data) savedCourseId = data.course_id;

  }

  if (error) {
    saveBtn.disabled = false;
    saveBtn.textContent = courseId ? "Update Course" : "Save Course";
    message.style.color = "#EF4444";
    message.innerHTML = error.message;
    return;
  }

  // Replace department tags entirely — simpler and safer than
  // trying to diff which checkboxes changed
  await client.from("course_departments").delete().eq("course_id", savedCourseId);

  const { error: deptError } = await client
    .from("course_departments")
    .insert(selectedDepartments.map(dept => ({ course_id: savedCourseId, department: dept })));

  saveBtn.disabled = false;
  saveBtn.textContent = courseId ? "Update Course" : "Save Course";

  if (deptError) {
    message.style.color = "#EF4444";
    message.innerHTML = deptError.message;
    return;
  }

  message.style.color = "#16A34A";
  message.innerHTML = "Course saved successfully.";

  setTimeout(() => {
    window.location.href = "courses.html";
  }, 800);

});