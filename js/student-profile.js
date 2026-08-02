/*
=========================================
VALMS Student Profile
=========================================
*/

const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");

async function loadStudent() {

    if (!studentId) {
        alert("Invalid Student.");
        window.location.href = "students.html";
        return;
    }

    const { data: student, error } = await client
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

    if (error) {
        console.error(error);
        alert("Student not found.");
        window.location.href = "students.html";
        return;
    }

    document.getElementById("studentName").textContent =
        `${student.first_name} ${student.last_name}`;

    document.getElementById("studentMatric").textContent =
        student.matric_number || "Pending Assignment";

    document.getElementById("firstName").textContent =
        student.first_name;

    document.getElementById("middleName").textContent =
        student.middle_name || "-";

    document.getElementById("lastName").textContent =
        student.last_name;

    document.getElementById("email").textContent =
        student.email;

    document.getElementById("phone").textContent =
        student.phone;

    document.getElementById("country").textContent =
        student.country;

    document.getElementById("year").textContent =
        student.admission_year;

    document.getElementById("cohort").textContent =
        student.cohort;

    document.getElementById("matric").textContent =
        student.matric_number || "Pending Assignment";

    document.getElementById("avatar").textContent =
        (
            student.first_name.charAt(0) +
            student.last_name.charAt(0)
        ).toUpperCase();

}

/*
=========================================
Edit Student
=========================================
*/

document.getElementById("editBtn").addEventListener("click", () => {

    window.location.href =
        `edit-student.html?id=${studentId}`;

});

/*
=========================================
Delete Student
=========================================
*/

document.getElementById("deleteBtn").addEventListener("click", async () => {

    const confirmDelete = confirm(
        "Delete this student?\n\nThis action cannot be undone."
    );

    if (!confirmDelete) return;

    const { error } = await client
        .from("students")
        .delete()
        .eq("id", studentId);

    if (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    alert("Student deleted successfully.");

    window.location.href = "students.html";

});

/*
=========================================
Start
=========================================
*/

loadStudent();