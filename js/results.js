/*
=========================================
Purpose Institute RESULTS (ADMIN)
Latest attempt only, grouped by session,
filterable by course and student group.
=========================================
*/

let allResults = [];

async function loadResults() {

  const { data: submissions, error } = await client
    .from("quiz_submissions")
    .select(`
      *,
      students(full_name, matric_number, group_number),
      quizzes(
        quiz_id, title, session_id,
        course_sessions(
          session_id, title,
          courses(course_id, course_title, course_code)
        )
      )
    `)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Keep only the latest attempt per (quiz, student) pair —
  // it overrides the earlier one.
  const latestMap = new Map();
  (submissions || []).forEach(s => {
    const key = `${s.quiz_id}-${s.student_id}`;
    if (!latestMap.has(key)) latestMap.set(key, s);
  });
  const deduped = [...latestMap.values()];

  // Total possible points per quiz, cached once per quiz.
  const quizIds = [...new Set(deduped.map(s => s.quiz_id))];
  const totalsByQuiz = {};

  for (const quizId of quizIds) {
    const { data: questions } = await client
      .from("quiz_questions")
      .select("points")
      .eq("quiz_id", quizId);

    totalsByQuiz[quizId] = (questions || []).reduce((sum, q) => sum + q.points, 0);
  }

  allResults = deduped.map(s => ({
    ...s,
    totalPoints: totalsByQuiz[s.quiz_id] || 0
  }));

  populateFilters(allResults);
  renderResults(allResults);

}

/* ==========================
Render — grouped by session
========================== */

function renderResults(results) {

  const container = document.getElementById("resultSections");
  container.innerHTML = "";

  if (results.length === 0) {
    container.innerHTML = `<div class="table-card">No quiz submissions match these filters.</div>`;
    updateStats(results);
    return;
  }

  // Group by session (falls back to quiz title if session data is missing)
  const sessions = new Map();

  results.forEach(r => {
    const session = r.quizzes?.course_sessions;
    const key = session?.session_id || r.quiz_id;

    if (!sessions.has(key)) {
      sessions.set(key, {
        label: session
          ? `${session.courses?.course_code || ""} — ${session.title}`
          : r.quizzes.title,
        rows: []
      });
    }
    sessions.get(key).rows.push(r);
  });

  sessions.forEach(group => {

    const card = document.createElement("div");
    card.className = "table-card";
    card.style.marginTop = "25px";

    card.innerHTML = `
      <div class="card-title">
        <h3>${group.label}</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Group</th>
            <th>Quiz</th>
            <th>Score</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          ${group.rows.map(r => {
            const percent = r.totalPoints > 0 ? Math.round((r.score / r.totalPoints) * 100) : 0;
            return `
              <tr>
                <td><strong>${r.students.full_name}</strong><br><span style="color:#94A3B8; font-size:12px;">${r.students.matric_number || "-"}</span></td>
                <td>${r.students.group_number ?? "-"}</td>
                <td>${r.quizzes.title}</td>
                <td><span class="status ${percent >= 70 ? "active" : "pending"}">${r.score} / ${r.totalPoints} (${percent}%)</span></td>
                <td>${new Date(r.submitted_at).toLocaleDateString()}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    container.appendChild(card);

  });

  updateStats(results);

}

function updateStats(results) {

  const totalSubmissions = results.length;
  const avgPercent = totalSubmissions > 0
    ? Math.round(
        results.reduce((sum, r) => sum + (r.totalPoints > 0 ? (r.score / r.totalPoints) * 100 : 0), 0) / totalSubmissions
      )
    : 0;
  const quizCount = new Set(results.map(r => r.quiz_id)).size;

  document.getElementById("totalSubmissions").textContent = totalSubmissions;
  document.getElementById("averageScore").textContent = `${avgPercent}%`;
  document.getElementById("quizCount").textContent = quizCount;

}

/* ==========================
Filters
========================== */

function populateFilters(results) {

  const courseFilter = document.getElementById("filterCourse");
  const groupFilter = document.getElementById("filterGroup");

  const seenCourses = new Set();
  const seenGroups = new Set();

  results.forEach(r => {
    const course = r.quizzes?.course_sessions?.courses;
    if (course && !seenCourses.has(course.course_id)) {
      seenCourses.add(course.course_id);
      courseFilter.innerHTML += `<option value="${course.course_id}">${course.course_code}</option>`;
    }

    const grp = r.students.group_number;
    if (grp && !seenGroups.has(grp)) {
      seenGroups.add(grp);
      groupFilter.innerHTML += `<option value="${grp}">Group ${grp}</option>`;
    }
  });

}

function applyFilters() {

  const keyword = document.getElementById("searchResult").value.toLowerCase();
  const courseId = document.getElementById("filterCourse").value;
  const groupNum = document.getElementById("filterGroup").value;

  const filtered = allResults.filter(r => {

    const matchesKeyword =
      r.students.full_name.toLowerCase().includes(keyword) ||
      r.quizzes.title.toLowerCase().includes(keyword);

    const course = r.quizzes?.course_sessions?.courses;
    const matchesCourse = !courseId || (course && course.course_id == courseId);
    const matchesGroup = !groupNum || r.students.group_number == groupNum;

    return matchesKeyword && matchesCourse && matchesGroup;

  });

  renderResults(filtered);

}

document.getElementById("searchResult").addEventListener("keyup", applyFilters);
document.getElementById("filterCourse").addEventListener("change", applyFilters);
document.getElementById("filterGroup").addEventListener("change", applyFilters);

/* ==========================
Start
========================== */

loadResults();