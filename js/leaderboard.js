/*
=========================================
Purpose Institute LEADERBOARD (ADMIN)
Ranked by average quiz score (latest
attempt per quiz only), filterable by
time scope, course, session, and group.
=========================================
*/

let allSubmissions = [];
let allCourses = [];

/* ==========================
Load Everything Once
========================== */

async function loadLeaderboardData() {

  const { data: submissions, error } = await client
    .from("quiz_submissions")
    .select(`
      *,
      students(full_name, group_number),
      quizzes(
        quiz_id,
        course_sessions(
          session_id, scheduled_date,
          courses(course_id, course_code)
        )
      )
    `)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Latest attempt per (quiz, student) only
  const latestMap = new Map();
  (submissions || []).forEach(s => {
    const key = `${s.quiz_id}-${s.student_id}`;
    if (!latestMap.has(key)) latestMap.set(key, s);
  });
  const deduped = [...latestMap.values()];

  // Total possible points per quiz
  const quizIds = [...new Set(deduped.map(s => s.quiz_id))];
  const totalsByQuiz = {};

  for (const quizId of quizIds) {
    const { data: questions } = await client
      .from("quiz_questions")
      .select("points")
      .eq("quiz_id", quizId);

    totalsByQuiz[quizId] = (questions || []).reduce((sum, q) => sum + q.points, 0);
  }

  allSubmissions = deduped.map(s => ({
    ...s,
    totalPoints: totalsByQuiz[s.quiz_id] || 0
  }));

  populateCourseFilter();
  applyFilters();

}

/* ==========================
Filters
========================== */

function populateCourseFilter() {

  const courseFilter = document.getElementById("filterCourse");
  const groupFilter = document.getElementById("filterGroup");
  const seenCourses = new Set();
  const seenGroups = new Set();

  allSubmissions.forEach(s => {
    const course = s.quizzes?.course_sessions?.courses;
    if (course && !seenCourses.has(course.course_id)) {
      seenCourses.add(course.course_id);
      courseFilter.innerHTML += `<option value="${course.course_id}">${course.course_code}</option>`;
    }

    const grp = s.students.group_number;
    if (grp && !seenGroups.has(grp)) {
      seenGroups.add(grp);
      groupFilter.innerHTML += `<option value="${grp}">Group ${grp}</option>`;
    }
  });

}

async function populateSessionFilter(courseId) {

  const sessionFilter = document.getElementById("filterSession");
  sessionFilter.innerHTML = `<option value="">All Sessions</option>`;

  if (!courseId) {
    sessionFilter.disabled = true;
    return;
  }

  const { data: sessions } = await client
    .from("course_sessions")
    .select("session_id, title, week")
    .eq("course_id", courseId)
    .order("week");

  (sessions || []).forEach(s => {
    sessionFilter.innerHTML += `<option value="${s.session_id}">Week ${s.week} — ${s.title}</option>`;
  });

  sessionFilter.disabled = false;

}

function getWeekRange(weekStr) {
  // weekStr format: "2026-W35"
  const [year, week] = weekStr.split("-W").map(Number);
  const jan4 = new Date(year, 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function applyFilters() {

  const scope = document.getElementById("filterScope").value;
  const courseId = document.getElementById("filterCourse").value;
  const sessionId = document.getElementById("filterSession").value;
  const groupNum = document.getElementById("filterGroup").value;

  let scopeLabel = "All Time";

  const filtered = allSubmissions.filter(s => {

    const session = s.quizzes?.course_sessions;
    const course = session?.courses;

    if (courseId && (!course || course.course_id != courseId)) return false;
    if (sessionId && session?.session_id != sessionId) return false;
    if (groupNum && s.students.group_number != groupNum) return false;

    if (scope === "week") {
      const weekVal = document.getElementById("weekPicker").value;
      if (!weekVal || !session?.scheduled_date) return false;
      const { start, end } = getWeekRange(weekVal);
      const d = new Date(session.scheduled_date);
      if (d < start || d > end) return false;
      scopeLabel = `Week of ${start.toLocaleDateString()}`;
    }

    if (scope === "month") {
      const monthVal = document.getElementById("monthPicker").value;
      if (!monthVal || !session?.scheduled_date) return false;
      if (!session.scheduled_date.startsWith(monthVal)) return false;
      scopeLabel = new Date(monthVal + "-02").toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }

    return true;

  });

  document.getElementById("scopeLabel").textContent = scopeLabel;

  renderLeaderboard(filtered);

}

/* ==========================
Render (aggregate per student)
========================== */

async function renderLeaderboard(rows) {

  const byStudent = new Map();

  rows.forEach(r => {
    const id = r.student_id;
    if (!byStudent.has(id)) {
      byStudent.set(id, {
        name: r.students.full_name,
        group: r.students.group_number,
        quizzes: 0,
        percentSum: 0
      });
    }
    const entry = byStudent.get(id);
    entry.quizzes++;
    entry.percentSum += r.totalPoints > 0 ? (r.score / r.totalPoints) * 100 : 0;
  });

  const sessionIds = [...new Set(rows.map(r => r.quizzes?.course_sessions?.session_id).filter(Boolean))];

  const attendanceCounts = {};
  if (sessionIds.length) {
    const { data: attendance } = await client
      .from("session_attendance")
      .select("student_id, session_id")
      .in("session_id", sessionIds);

    (attendance || []).forEach(a => {
      attendanceCounts[a.student_id] = (attendanceCounts[a.student_id] || 0) + 1;
    });
  }

  const ranked = [...byStudent.entries()]
    .map(([studentId, data]) => ({
      studentId,
      ...data,
      avgPercent: data.quizzes > 0 ? data.percentSum / data.quizzes : 0,
      attended: attendanceCounts[studentId] || 0
    }))
    .sort((a, b) => b.avgPercent - a.avgPercent);

  const table = document.getElementById("leaderboardTable");
  table.innerHTML = "";

  if (ranked.length === 0) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px;">No quiz activity in this scope.</td></tr>`;
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];

  ranked.forEach((r, i) => {
    table.innerHTML += `
      <tr>
        <td style="font-weight:700;">${medals[i] || i + 1}</td>
        <td>${r.name}</td>
        <td>${r.group ?? "-"}</td>
        <td>${r.quizzes}</td>
        <td><span class="status ${r.avgPercent >= 70 ? "active" : "pending"}">${Math.round(r.avgPercent)}%</span></td>
        <td>${r.attended}</td>
      </tr>
    `;
  });

}

/* ==========================
Event Wiring
========================== */

document.getElementById("filterScope").addEventListener("change", function () {
  document.getElementById("weekPicker").style.display = this.value === "week" ? "block" : "none";
  document.getElementById("monthPicker").style.display = this.value === "month" ? "block" : "none";

  if (this.value === "week" && !document.getElementById("weekPicker").value) {
    const now = new Date();
    const week = Math.ceil((((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);
    document.getElementById("weekPicker").value = `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  if (this.value === "month" && !document.getElementById("monthPicker").value) {
    document.getElementById("monthPicker").value = new Date().toISOString().slice(0, 7);
  }

  applyFilters();
});

document.getElementById("weekPicker").addEventListener("change", applyFilters);
document.getElementById("monthPicker").addEventListener("change", applyFilters);

document.getElementById("filterCourse").addEventListener("change", function () {
  populateSessionFilter(this.value).then(applyFilters);
});

document.getElementById("filterSession").addEventListener("change", applyFilters);
document.getElementById("filterGroup").addEventListener("change", applyFilters);

/* ==========================
Start
========================== */

loadLeaderboardData();