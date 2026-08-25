/*
=========================================
Purpose Institute Students
=========================================
*/

async function loadStudents() {

  const { data: students, error } = await client
    .from("students")
    .select("*")
    .eq("role", "student")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const table = document.getElementById("studentTable");
  table.innerHTML = "";

  let assigned = 0;
  let pending = 0;
  let international = 0;

  const years = new Set();
  const countries = new Set();

  students.forEach(student => {

    if (student.admission_year) years.add(student.admission_year);
    if (student.country) countries.add(student.country);

    if (student.country && student.country !== "Nigeria") {
      international++;
    }

    if (student.matric_number) {
      assigned++;
    } else {
      pending++;
    }

    table.innerHTML += `
      <tr>
        <td><strong>${student.last_name}, ${student.first_name}</strong></td>
        <td>${student.email}</td>
        <td>${student.country ?? "-"}</td>
        <td>${student.admission_year ?? "-"}</td>
        <td>${student.matric_number ?? "-"}</td>
        <td>
          ${
            student.matric_number
              ? `<span class="status assigned">Assigned</span>`
              : `<span class="status pending">Pending</span>`
          }
        </td>
        <td>
          <button class="action-btn" onclick="viewStudent('${student.student_id}')">
            View
          </button>
        </td>
      </tr>`;
  });

  document.getElementById("totalStudents").textContent = students.length;
  document.getElementById("assignedMatric").textContent = assigned;
  document.getElementById("pendingMatric").textContent = pending;
  document.getElementById("internationalStudents").textContent = international;

  const yearFilter = document.getElementById("filterYear");
  yearFilter.innerHTML = `<option value="">Admission Year</option>`;

  [...years].sort().forEach(year => {
    yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
  });

  const countryFilter = document.getElementById("filterCountry");
  countryFilter.innerHTML = `<option value="">Country</option>`;

  [...countries].sort().forEach(country => {
    countryFilter.innerHTML += `<option value="${country}">${country}</option>`;
  });

}

/*
=========================================
Search
=========================================
*/

document.getElementById("searchStudent").addEventListener("keyup", function () {
  const value = this.value.toLowerCase();

  document.querySelectorAll("#studentTable tr").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(value) ? "" : "none";
  });
});

/*
=========================================
Generate Matric Numbers
=========================================
*/

document.getElementById("generateMatric").addEventListener("click", async () => {

  if (!confirm("Generate matric numbers for all students without one?")) return;

  const year = new Date().getFullYear().toString().slice(-2);

  const { error } = await client.rpc("generate_matric_numbers", {
    p_year: year,
    p_cohort: "01"
  });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  alert("Matric numbers generated successfully.");
  loadStudents();

});

/*
=========================================
Assign Groups
=========================================
*/

document.getElementById("assignGroups").addEventListener("click", async () => {

  if (!confirm("Assign groups of 20 for all students without one?")) return;

  const { data: settings } = await client
    .from("app_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["current_cohort", "current_year"]);

  const cohort = settings?.find(s => s.setting_key === "current_cohort")?.setting_value;
  const year = settings?.find(s => s.setting_key === "current_year")?.setting_value;

  if (!cohort || !year) {
    alert("current_cohort / current_year isn't set in app_settings yet — set those first.");
    return;
  }

  const { error } = await client.rpc("assign_student_groups", {
    p_year: year,
    p_cohort: cohort
  });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  alert("Groups assigned successfully. Set WhatsApp links from the Groups page.");
  loadStudents();

});

/*
=========================================
View Student
=========================================
*/

function viewStudent(id) {
  window.location.href = `student-profile.html?id=${id}`;
}

/*
=========================================
Start
=========================================
*/

loadStudents();