/*
=========================================
Purpose Institute MY RESULTS (STUDENT)
=========================================
*/

async function loadResults() {

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: student } = await client
    .from("students")
    .select("student_id")
    .eq("auth_user_id", user.id)
    .single();

  const { data: allSubmissions, error } = await client
    .from("quiz_submissions")
    .select(`
      *,
      quizzes(
        title,
        course_sessions(
          title,
          courses(course_title, course_code)
        )
      )
    `)
    .eq("student_id", student.student_id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  // Keep only the latest attempt per quiz — it overrides the earlier one.
  const latestByQuiz = new Map();
  (allSubmissions || []).forEach(s => {
    if (!latestByQuiz.has(s.quiz_id)) latestByQuiz.set(s.quiz_id, s);
  });
  const submissions = [...latestByQuiz.values()];

  // Total possible points per quiz, for turning raw score into a %.
  const quizIds = submissions.map(s => s.quiz_id);
  const totalsByQuiz = {};

  for (const quizId of quizIds) {
    const { data: questions } = await client
      .from("quiz_questions")
      .select("points")
      .eq("quiz_id", quizId);

    totalsByQuiz[quizId] = (questions || []).reduce((sum, q) => sum + q.points, 0);
  }

  const table = document.getElementById("resultsTable");
  table.innerHTML = "";

  if (submissions.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:40px;">
          No quiz results yet.
        </td>
      </tr>
    `;
  } else {

    submissions.forEach(s => {

      const total = totalsByQuiz[s.quiz_id] || 0;
      const percent = total > 0 ? Math.round((s.score / total) * 100) : 0;
      const course = s.quizzes?.course_sessions?.courses;

      table.innerHTML += `
        <tr>
          <td>${course ? course.course_code : "-"}</td>
          <td>${s.quizzes.title}</td>
          <td>${s.score} / ${total} (${percent}%)</td>
          <td>${new Date(s.submitted_at).toLocaleDateString()}</td>
        </tr>
      `;

    });

  }

  document.getElementById("quizCount").textContent = submissions.length;

  const avgPercent = submissions.length > 0
    ? Math.round(
        submissions.reduce((sum, s) => {
          const total = totalsByQuiz[s.quiz_id] || 0;
          return sum + (total > 0 ? (s.score / total) * 100 : 0);
        }, 0) / submissions.length
      )
    : 0;

  document.getElementById("averageScore").textContent = `${avgPercent}%`;

}

loadResults();