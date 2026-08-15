/*
=========================================
Purpose Institute RESULTS (ADMIN)
=========================================
*/

let allResults = [];

async function loadResults() {

  const { data: submissions, error } = await client
    .from("quiz_submissions")
    .select(`
      *,
      students(full_name, matric_number),
      quizzes(
        title,
        course_sessions(
          title,
          courses(course_id, course_title, course_code)
        )
      )
    `)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Total possible points per quiz, needed to turn raw score into a %.
  // Fetched once per quiz and cached, rather than per submission.
  const quizIds = [...new Set(submissions.map(s => s.quiz_id))];
  const totalsByQuiz = {};

  for (const quizId of quizIds) {
    const { data: questions } = await client
      .from("quiz_questions")
      .select("points")
      .eq("quiz_id", quizId);

    totalsByQuiz[quizId] = (questions || []).reduce((sum, q) => sum + q.points, 0);
  }

  allResults = submissions.map(s => ({
    ...s,
    totalPoints: totalsByQuiz[s.quiz_id] || 0
  }));

  populateCourseFilter(allResults);
  renderResults(allResults);

}

/* ==========================
Render Table + Stats
========================== */

function renderResults(results) {

  const table = document.getElementById("resultsTable");
  table.innerHTML = "";

  if (results.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:40px;">
          No quiz submissions yet.
        </td>
      </tr>
    `;
  } else {

    results.forEach(r => {

      const percent = r.totalPoints > 0
        ? Math.round((r.score / r.totalPoints) * 100)
        : 0;

      const course = r.quizzes?.course_sessions?.courses;

      table.innerHTML += `
        <tr>
          <td><strong>${r.students.full_name}</strong><br><span style="color:#94A3B8; font-size:12px;">${r.students.matric_number || "-"}</span></td>
          <td>${course ? course.course_code : "-"}</td>
          <td>${r.quizzes.title}</td>
          <td>${r.score} / ${r.totalPoints} (${percent}%)</td>
          <td>${new Date(r.submitted_at).toLocaleDateString()}</td>
        </tr>
      `;

    });

  }

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
Course Filter
========================== */

function populateCourseFilter(results) {

  const courseFilter = document.getElementById("filterCourse");
  const seen = new Set();

  results.forEach(r => {
    const course = r.quizzes?.course_sessions?.courses;
    if (course && !seen.has(course.course_id)) {
      seen.add(course.course_id);
      courseFilter.innerHTML += `<option value="${course.course_id}">${course.course_code}</option>`;
    }
  });

}

/* ==========================
Search + Filter
========================== */

function applyFilters() {

  const keyword = document.getElementById("searchResult").value.toLowerCase();
  const courseId = document.getElementById("filterCourse").value;

  const filtered = allResults.filter(r => {

    const matchesKeyword =
      r.students.full_name.toLowerCase().includes(keyword) ||
      r.quizzes.title.toLowerCase().includes(keyword);

    const course = r.quizzes?.course_sessions?.courses;
    const matchesCourse = !courseId || (course && course.course_id == courseId);

    return matchesKeyword && matchesCourse;

  });

  renderResults(filtered);

}

document.getElementById("searchResult").addEventListener("keyup", applyFilters);
document.getElementById("filterCourse").addEventListener("change", applyFilters);

/* ==========================
Start
========================== */

loadResults();