/*
=========================================
VALMS STUDENT DETAILS
=========================================
*/

const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");

if (!studentId) {
  alert("Student not found.");
  window.location.href = "students.html";
}

/* ==========================
Admin-Only Guard
========================== */

async function checkAdminAccess() {

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return false;
  }

  const { data: me } = await client
    .from("students")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!me || me.role !== "admin") {
    alert("You don't have access to this page.");
    window.location.href = "dashboard.html";
    return false;
  }

  return true;

}

/* ==========================
Load Student
========================== */

async function loadStudent() {

  const { data, error } = await client
    .from("students")
    .select("*")
    .eq("student_id", studentId)
    .single();

  if (error) {
    alert("Student not found.");
    window.location.href = "students.html";
    return;
  }

  document.getElementById("studentFullName").textContent = data.full_name;
  document.getElementById("studentMatric").textContent = data.matric_number || "Pending Assignment";

  const initials = (data.first_name[0] + data.last_name[0]).toUpperCase();
  document.getElementById("studentAvatar").textContent = initials;

  document.getElementById("first_name").value = data.first_name;
  document.getElementById("middle_name").value = data.middle_name || "";
  document.getElementById("last_name").value = data.last_name;
  document.getElementById("email").value = data.email;
  document.getElementById("phone").value = data.phone;
  document.getElementById("country").value = data.country;
  document.getElementById("admission_year").value = data.admission_year;
  document.getElementById("cohort").value = data.cohort;
  document.getElementById("matric_number").value = data.matric_number || "Pending Assignment";
  document.getElementById("group_number").value = data.group_number || "";

}

/* ==========================
Save Student
========================== */

document.getElementById("saveStudent").addEventListener("click", async () => {

  const firstName = document.getElementById("first_name").value;
  const middleName = document.getElementById("middle_name").value;
  const lastName = document.getElementById("last_name").value;

  const fullName = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, " ").trim();

  const { error } = await client
    .from("students")
    .update({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      full_name: fullName,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      country: document.getElementById("country").value,
      admission_year: document.getElementById("admission_year").value,
      cohort: document.getElementById("cohort").value,
      group_number: document.getElementById("group_number").value
        ? parseInt(document.getElementById("group_number").value)
        : null
    })
    .eq("student_id", studentId);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Student updated successfully.");
  loadStudent();

});

/* ==========================
Delete Student
========================== */

document.getElementById("deleteStudent").addEventListener("click", async () => {

  const confirmed = confirm("Delete this student?");
  if (!confirmed) return;

  const { data, error } = await client
    .from("students")
    .delete()
    .eq("student_id", studentId)
    .select();

  if (error) {
    alert(error.message);
    return;
  }

  alert("Student deleted.");
  window.location.href = "students.html";

});

/* ==========================
Reset Password
========================== */

document.getElementById("resetPassword").addEventListener("click", () => {
  alert("Password reset module will be connected later.");
});

/* ==========================
Start
========================== */

(async () => {
  const allowed = await checkAdminAccess();
  if (allowed) loadStudent();
})();