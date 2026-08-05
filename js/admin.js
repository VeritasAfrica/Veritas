/*
=========================================
VALMS ADMIN DASHBOARD
=========================================
*/

/* ==========================
Assign Matric
========================== */

async function assignMatric(id) {
  alert("Matric Generator will be connected here.");
  /*
    Later we'll automatically generate
    VAL/25/CSC/001
    and update Supabase.
  */
}

/* ==========================
Generate Matric Numbers
========================== */

async function generateMatricNumbers() {
  const year = new Date().getFullYear().toString().slice(-2);

  const { error } = await client.rpc("generate_matric_numbers", {
    p_year: year,
    p_cohort: "01"
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Matric numbers generated.");
  loadDashboard();
}

/* ==========================
Load Dashboard
========================== */

async function loadDashboard() {
  /* ---------- Students ---------- */
  const { data: students = [] } = await client
    .from("students")
    .select("*")
    .order("registered_at", { ascending: false });

  console.log("Students:", students);
  console.log("Student count:", students?.length);

  /* ---------- Lecturers ---------- 
  const { data: lecturers = [] } = await client
    .from("lecturers")
    .select("*"); */

  /* ---------- Courses ---------- */
  const { data: courses = [] } = await client
    .from("courses")
    .select("*"); 

  /* ---------- Departments ---------- 
  const { data: departments = [] } = await client
    .from("departments")
    .select("*");  */

  /* ---------- Counts ---------- */
  const studentCounter = document.getElementById("studentCount");
  studentCounter.textContent = "0";
  animateValue(studentCounter, 0, students.length, 1200);
  /* document.getElementById("lecturerCount").textContent = lecturers.length; */
  const courseCounter = document.getElementById("courseCount");
  courseCounter.textContent = "0";
  animateValue(courseCounter, 0, courses.length, 1200);
  /* document.getElementById("departmentCount").textContent = departments.length; */

  /* ---------- Table ---------- */
  const table = document.getElementById("studentTable");
  table.innerHTML = "";

  students.slice(0, 6).forEach(student => {
    table.innerHTML += `
      <tr>
        <td><strong>${student.first_name} ${student.last_name}</strong></td>
        <td>${student.email}</td>
        <td>
          ${
            student.matric_number
              ? `<span class="status active">Assigned</span>`
              : `<span class="status pending">Awaiting</span>`
          }
        </td>
        <td>
          ${
            student.matric_number
              ? `<button class="view-btn">View</button>`
              : `<button class="assign-btn" onclick="assignMatric('${student.student_id}')">Assign Matric</button>`
          }
        </td>
      </tr>
    `;
  });
}

/* ==========================
Attendance Chart
========================== */

const attendanceCtx = document.getElementById("attendanceChart");

if (attendanceCtx) {
  new Chart(attendanceCtx, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      datasets: [{
        label: "Attendance",
        data: [82, 91, 87, 93, 90, 95],
        borderColor: "#34C759",
        backgroundColor: "rgba(52,199,89,.12)",
        fill: true,
        tension: .4,
        pointRadius: 4,
        pointBackgroundColor: "#34C759"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#EEF2F7" } }
      }
    }
  });
}

/* ==========================
Department Chart
========================== */

const departmentCtx = document.getElementById("departmentChart");

if (departmentCtx) {
  new Chart(departmentCtx, {
    type: "doughnut",
    data: {
      labels: ["CSC", "Accounting", "Law", "Nursing"],
      datasets: [{
        data: [38, 24, 18, 20],
        backgroundColor: ["#34C759", "#3B82F6", "#F59E0B", "#8B5CF6"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 20, boxWidth: 14 }
        }
      }
    }
  });
}

/* ==========================
Counter Animation
========================== */

function animateValue(element, start, end, duration) {
  let startTime = null;

  function animation(currentTime) {
    if (!startTime) startTime = currentTime;

    const progress = Math.min((currentTime - startTime) / duration, 1);
    element.textContent = Math.floor(progress * (end - start) + start);

    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

/* ==========================
Animate Cards
========================== */

/* window.addEventListener("load", () => {
  document.querySelectorAll(".card h2").forEach(el => {
    const value = parseInt(el.textContent) || 0;
    animateValue(el, 0, value, 1200);
  });
}); */

/* ==========================
Mobile Sidebar
========================== */

const sidebar = document.querySelector(".sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");

if (menuBtn && sidebar && overlay) {
  menuBtn.addEventListener("click", () => {
    sidebar.classList.add("show");
    overlay.classList.add("show");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      sidebar.classList.remove("show");
      overlay.classList.remove("show");
    }
  });
}

/* ==========================
Generate Matric Button
========================== */

const generateBtn = document.getElementById("generateMatric");

if (generateBtn) {
  generateBtn.addEventListener("click", generateMatricNumbers);
}

/* ==========================
Start
========================== */

loadDashboard();