/*
=========================================
Purpose Institute QUIZ RESULTS (per-session)
=========================================
*/

const params = new URLSearchParams(window.location.search);
const quizId = params.get("quiz");

if (!quizId) {
  alert("No quiz selected.");
  window.location.href = "courses.html";
}

let allRows = [];

async function loadResults() {

  const { data: quiz, error: quizError } = await client
    .from("quizzes")
    .select("*, quiz_questions(points), course_sessions(session_id, title, courses(course_code, course_title))")
    .eq("quiz_id", quizId)
    .single();

  if (quizError || !quiz) {
    alert("Quiz not found.");
    window.location.href = "courses.html";
    return;
  }

  document.getElementById("quizTitle").textContent = quiz.title;
  document.getElementById("sessionInfo").textContent =
    `${quiz.course_sessions?.courses?.course_code || ""} — ${quiz.course_sessions?.title || ""}`;

  const totalPoints = (quiz.quiz_questions || []).reduce((s, q) => s + q.points, 0);
  const sessionId = quiz.course_sessions?.session_id;

  const { data: submissions, error } = await client
    .from("quiz_submissions")
    .select("*, students(full_name, matric_number)")
    .eq("quiz_id", quizId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Which of these students actually got attendance for this session
  const { data: attendanceRows } = sessionId
    ? await client.from("session_attendance").select("student_id").eq("session_id", sessionId)
    : { data: [] };

  const attendedIds = new Set((attendanceRows || []).map(a => a.student_id));

  allRows = submissions.map(s => ({
    ...s,
    totalPoints,
    attended: attendedIds.has(s.student_id)
  }));

  renderResults(allRows);

}

function renderResults(rows) {

  const table = document.getElementById("resultsTable");
  table.innerHTML = "";

  if (rows.length === 0) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px;">No submissions yet.</td></tr>`;
  } else {

    rows.forEach(r => {
      const percent = r.totalPoints > 0 ? Math.round((r.score / r.totalPoints) * 100) : 0;
      const passed = percent >= 70;

      table.innerHTML += `
        <tr>
          <td>${r.students.full_name}</td>
          <td>${r.students.matric_number || "-"}</td>
          <td>${r.attempt_number}</td>
          <td><span class="status ${passed ? "active" : "pending"}">${r.score}/${r.totalPoints} (${percent}%)</span></td>
          <td>${new Date(r.submitted_at).toLocaleString()}</td>
          <td>${r.attended ? "✅" : "-"}</td>
        </tr>
      `;
    });

  }

  const submissionCount = rows.length;
  const avgPercent = submissionCount > 0
    ? Math.round(rows.reduce((sum, r) => sum + (r.totalPoints > 0 ? (r.score / r.totalPoints) * 100 : 0), 0) / submissionCount)
    : 0;
  const passedCount = rows.filter(r => r.totalPoints > 0 && (r.score / r.totalPoints) * 100 >= 70).length;
  const attendanceCount = rows.filter(r => r.attended).length;

  document.getElementById("submissionCount").textContent = submissionCount;
  document.getElementById("averageScore").textContent = `${avgPercent}%`;
  document.getElementById("passedCount").textContent = passedCount;
  document.getElementById("attendanceCount").textContent = attendanceCount;

}

document.getElementById("searchResult").addEventListener("keyup", function () {
  const keyword = this.value.toLowerCase();
  renderResults(allRows.filter(r => r.students.full_name.toLowerCase().includes(keyword)));
});

loadResults();