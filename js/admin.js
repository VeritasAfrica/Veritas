/*
=========================================
Purpose Institute ADMIN DASHBOARD
=========================================
*/

/* ==========================
Generate Matric Numbers
========================== */

async function generateMatricNumbers() {

  const { data: settings } = await client
    .from("app_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["current_cohort", "current_year"]);

  const cohort = settings?.find(s => s.setting_key === "current_cohort")?.setting_value;
  const yearFull = settings?.find(s => s.setting_key === "current_year")?.setting_value;

  if (!cohort || !yearFull) {
    alert("current_cohort / current_year isn't set in app_settings yet.");
    return;
  }

  // Matric numbers use a short 2-digit year (e.g. "26"), unlike the
  // long admission_year format ("2026/2027") — pull it from the first
  // 4 digits of the shared year setting rather than hardcoding it.
  const year = yearFull.slice(2, 4);

  const { error } = await client.rpc("generate_matric_numbers", {
    p_year: year,
    p_cohort: cohort
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Matric numbers generated.");
  loadDashboard();

}

/* ==========================
Assign Groups
========================== */

async function assignGroups() {

  const { data: settings } = await client
    .from("app_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["current_cohort", "current_year"]);

  const cohort = settings?.find(s => s.setting_key === "current_cohort")?.setting_value;
  const year = settings?.find(s => s.setting_key === "current_year")?.setting_value;

  if (!cohort || !year) {
    alert("current_cohort / current_year isn't set in app_settings yet.");
    return;
  }

  const { error } = await client.rpc("assign_student_groups", {
    p_year: year,
    p_cohort: cohort
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Groups assigned. Set WhatsApp links from the Groups page.");
  loadDashboard();

}

/* ==========================
Load Dashboard
========================== */

async function loadDashboard() {

  const { data: students = [] } = await client
    .from("students")
    .select("*")
    .eq("role", "student")
    .order("student_id", { ascending: false });

  const { data: courses = [] } = await client
    .from("courses")
    .select("*");

  const { data: departmentTags = [] } = await client
    .from("course_departments")
    .select("department");

  const { data: attendanceRows = [] } = await client
    .from("session_attendance")
    .select("marked_at");

  /* ---------- Stat Cards ---------- */

  const studentCounter = document.getElementById("studentCount");
  studentCounter.textContent = "0";
  animateValue(studentCounter, 0, students.length, 1200);

  const courseCounter = document.getElementById("courseCount");
  courseCounter.textContent = "0";
  animateValue(courseCounter, 0, courses.length, 1200);

  const activeDepartments = new Set(departmentTags.map(d => d.department)).size;
  document.getElementById("departmentCount").textContent = activeDepartments;

  const attendanceCounter = document.getElementById("attendanceTotal");
  attendanceCounter.textContent = "0";
  animateValue(attendanceCounter, 0, attendanceRows.length, 1200);

  /* ---------- Recent Registrations Table ---------- */

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
          <button class="view-btn" onclick="window.location.href='student-profile.html?id=${student.student_id}'">View</button>
        </td>
      </tr>
    `;
  });

  /* ---------- To-Do List (real, actionable items only) ---------- */

  const awaitingMatric = students.filter(s => !s.matric_number).length;
  const awaitingGroup = students.filter(s => !s.group_number).length;
  const draftCourses = courses.filter(c => c.status === "Draft").length;

  const todoItems = [
    {
      icon: "fa-id-card",
      label: "Students Awaiting Matric Number",
      count: awaitingMatric,
      link: "students.html"
    },
    {
      icon: "fa-users",
      label: "Students Awaiting Group Assignment",
      count: awaitingGroup,
      link: "students.html"
    },
    {
      icon: "fa-book",
      label: "Draft Courses Not Yet Published",
      count: draftCourses,
      link: "courses.html"
    }
  ].filter(item => item.count > 0);

  const todoList = document.getElementById("todoList");
  todoList.innerHTML = "";

  if (todoItems.length === 0) {
    todoList.innerHTML = `<p style="color:#94A3B8; padding:10px 0;">Nothing pending — all caught up.</p>`;
  } else {
    todoItems.forEach(item => {
      todoList.innerHTML += `
        <div class="pending-item" style="cursor:pointer;" onclick="window.location.href='${item.link}'">
          <div>
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.label}</span>
          </div>
          <span class="badge">${item.count}</span>
        </div>
      `;
    });
  }

  /* ---------- Charts ---------- */

  renderAttendanceChart(attendanceRows);
  renderDepartmentChart(students);

}

/* ==========================
Attendance Chart (real, last 7 days)
========================== */

let attendanceChartInstance = null;

function renderAttendanceChart(attendanceRows) {

  const ctx = document.getElementById("attendanceChart");
  if (!ctx) return;

  const days = [];
  const counts = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString(undefined, { weekday: "short" });

    days.push(label);
    counts.push(attendanceRows.filter(a => a.marked_at.startsWith(dateStr)).length);
  }

  if (attendanceChartInstance) attendanceChartInstance.destroy();

  attendanceChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: days,
      datasets: [{
        label: "Attendance",
        data: counts,
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
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#EEF2F7" }, ticks: { precision: 0 } }
      }
    }
  });

}

/* ==========================
Department Chart (real, by student.department)
========================== */

let departmentChartInstance = null;

function renderDepartmentChart(students) {

  const ctx = document.getElementById("departmentChart");
  if (!ctx) return;

  const counts = {};
  students.forEach(s => {
    const dept = s.department || "All";
    counts[dept] = (counts[dept] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = Object.values(counts);
  const colors = ["#34C759", "#3B82F6", "#F59E0B", "#8B5CF6"];

  if (departmentChartInstance) departmentChartInstance.destroy();

  departmentChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => colors[i % colors.length]),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { position: "bottom", labels: { padding: 20, boxWidth: 14 } }
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
Quick Action Buttons
========================== */

document.getElementById("generateMatric").addEventListener("click", generateMatricNumbers);
document.getElementById("assignGroupsBtn").addEventListener("click", assignGroups);
document.getElementById("createCourseBtn").addEventListener("click", () => {
  window.location.href = "create-course.html";
});

/* ==========================
Start
========================== */

loadDashboard();