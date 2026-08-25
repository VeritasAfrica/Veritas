/*
=========================================
Purpose Institute STUDENT QUIZ HISTORY
(admin view — every quiz result for one
student, latest attempt only, across
every course/session)
=========================================
*/

const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");

if (!studentId) {
  alert("No student selected.");
  window.location.href = "students.html";
}

async function loadHistory() {

  const { data: student, error: studentError } = await client
    .from("students")
    .select("*")
    .eq("student_id", studentId)
    .single();

  if (studentError || !student) {
    alert("Student not found.");
    window.location.href = "students.html";
    return;
  }

  document.getElementById("studentName").textContent = `${student.first_name} ${student.last_name}`;
  document.getElementById("studentMatric").textContent = student.matric_number || "Pending Assignment";

  const { data: submissions, error } = await client
    .from("quiz_submissions")
    .select(`
      *,
      quizzes(
        title, session_id,
        course_sessions(
          session_id, title,
          courses(course_code, course_title)
        )
      )
    `)
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Latest attempt per quiz only
  const latestMap = new Map();
  (submissions || []).forEach(s => {
    if (!latestMap.has(s.quiz_id)) latestMap.set(s.quiz_id, s);
  });
  const results = [...latestMap.values()];

  const quizIds = results.map(r => r.quiz_id);
  const totalsByQuiz = {};

  for (const quizId of quizIds) {
    const { data: questions } = await client
      .from("quiz_questions")
      .select("points")
      .eq("quiz_id", quizId);

    totalsByQuiz[quizId] = (questions || []).reduce((sum, q) => sum + q.points, 0);
  }

  const sessionIds = [...new Set(results.map(r => r.quizzes?.session_id).filter(Boolean))];

  const { data: attendanceRows } = sessionIds.length
    ? await client.from("session_attendance").select("session_id").eq("student_id", studentId).in("session_id", sessionIds)
    : { data: [] };

  const attendedSessionIds = new Set((attendanceRows || []).map(a => a.session_id));

  document.getElementById("quizCount").textContent = results.length;
  document.getElementById("attendanceCount").textContent = attendedSessionIds.size;

  const avgPercent = results.length > 0
    ? Math.round(
        results.reduce((sum, r) => {
          const total = totalsByQuiz[r.quiz_id] || 0;
          return sum + (total > 0 ? (r.score / total) * 100 : 0);
        }, 0) / results.length
      )
    : 0;
  document.getElementById("averageScore").textContent = `${avgPercent}%`;

  const table = document.getElementById("resultsTable");
  table.innerHTML = "";

  if (results.length === 0) {
    table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px;">No quiz results yet.</td></tr>`;
    return;
  }

  results.forEach(r => {

    const total = totalsByQuiz[r.quiz_id] || 0;
    const percent = total > 0 ? Math.round((r.score / total) * 100) : 0;
    const session = r.quizzes?.course_sessions;
    const attended = session ? attendedSessionIds.has(session.session_id) : false;

    table.innerHTML += `
      <tr>
        <td>${session?.courses?.course_code || "-"}</td>
        <td>${session?.title || "-"}</td>
        <td>${r.quizzes.title}</td>
        <td>${r.attempt_number}</td>
        <td><span class="status ${percent >= 70 ? "active" : "pending"}">${r.score} / ${total} (${percent}%)</span></td>
        <td>${new Date(r.submitted_at).toLocaleDateString()}</td>
        <td>${attended ? "✅" : "-"}</td>
      </tr>
    `;

  });

}

loadHistory();