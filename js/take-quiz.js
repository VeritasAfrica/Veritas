/*
=========================================
Purpose Institute TAKE QUIZ
=========================================
*/

const params = new URLSearchParams(window.location.search);
const quizId = params.get("quiz");

if (!quizId) {
  alert("No quiz selected.");
  window.location.href = "student-courses.html";
}

let studentId = null;
let quizSessionId = null;

async function loadQuiz() {

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

  studentId = student.student_id;

  const { data: quiz, error } = await client
    .from("quizzes")
    .select("*, quiz_questions(*), session_id")
    .eq("quiz_id", quizId)
    .eq("status", "Published")
    .single();

  if (error || !quiz) {
    alert("Quiz not found or not available.");
    window.location.href = "student-courses.html";
    return;
  }

  quizSessionId = quiz.session_id;

  const { data: sessionInfo } = await client
    .from("course_sessions")
    .select("scheduled_date, start_time")
    .eq("session_id", quiz.session_id)
    .single();

  if (sessionInfo?.scheduled_date && sessionInfo?.start_time) {
    const startDateTime = new Date(`${sessionInfo.scheduled_date}T${sessionInfo.start_time}`);

    if (new Date() < startDateTime) {
      document.getElementById("quizForm").style.display = "none";
      document.querySelector(".topbar h2").textContent = quiz.title;
      document.getElementById("quizDescription").innerHTML =
        `<div class="table-card" style="text-align:center; padding:40px;">
           <i class="fa-solid fa-lock" style="font-size:36px; color:#94A3B8; margin-bottom:16px;"></i>
           <p>This quiz unlocks when the class starts, at ${startDateTime.toLocaleString()}.</p>
         </div>`;
      return;
    }
  }

  const { data: existing } = await client
    .from("quiz_submissions")
    .select("score, attempt_number")
    .eq("quiz_id", quizId)
    .eq("student_id", studentId)
    .order("attempt_number", { ascending: false });

  const totalPoints = quiz.quiz_questions.reduce((s, q) => s + q.points, 0);

  if (existing && existing.length > 0) {

    const latest = existing[0];
    const percent = totalPoints > 0 ? Math.round((latest.score / totalPoints) * 100) : 0;
    const passed = percent >= 70;

    if (passed || existing.length >= 2) {
      await showResult(latest.score, totalPoints, quiz.title);
      return;
    }

    // One attempt used, failed — allow the retake, but warn it's final
    document.getElementById("quizDescription").innerHTML =
      `${quiz.description || ""}<br><strong style="color:#EF4444;">This is your final attempt.</strong>`;

  } else {
    document.getElementById("quizDescription").textContent = quiz.description || "";
  }

  document.querySelector(".topbar h2").textContent = quiz.title;

  const list = document.getElementById("questionList");
  list.innerHTML = "";

  quiz.quiz_questions.forEach((q, index) => {

    const options = [
      { key: "a", text: q.option_a },
      { key: "b", text: q.option_b },
      { key: "c", text: q.option_c },
      { key: "d", text: q.option_d }
    ].filter(o => o.text);

    const card = document.createElement("div");
    card.className = "question-card";
    card.innerHTML = `
      <p class="question-text">${index + 1}. ${q.question_text}</p>
      ${options.map(o => `
        <label class="option-label">
          <input type="radio" name="q_${q.question_id}" value="${o.key}" required>
          ${o.key.toUpperCase()}) ${o.text}
        </label>
      `).join("")}
    `;

    list.appendChild(card);

  });

}

document.getElementById("quizForm").addEventListener("submit", async (e) => {

  e.preventDefault();

  const formData = new FormData(e.target);
  const answers = {};

  for (const [key, value] of formData.entries()) {
    const questionId = key.replace("q_", "");
    answers[questionId] = value;
  }

  const submitBtn = document.getElementById("submitQuizBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const { data, error } = await client
    .from("quiz_submissions")
    .insert({
      quiz_id: quizId,
      student_id: studentId,
      answers
    })
    .select()
    .single();

  if (error) {
    // The trigger raises specific messages like "No more attempts allowed"
    alert(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Quiz";
    return;
  }

  const { data: quiz } = await client
    .from("quizzes")
    .select("quiz_questions(points)")
    .eq("quiz_id", quizId)
    .single();

  const totalPoints = quiz.quiz_questions.reduce((s, q) => s + q.points, 0);

  await showResult(data.score, totalPoints, document.querySelector(".topbar h2").textContent);

});

async function showResult(score, totalPoints, title) {

  document.getElementById("quizForm").style.display = "none";

  const percent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passed = percent >= 70;

  const { data: attendance } = await client
    .from("session_attendance")
    .select("attendance_id")
    .eq("session_id", quizSessionId)
    .eq("student_id", studentId)
    .maybeSingle();

  const resultBox = document.getElementById("resultBox");
  resultBox.style.display = "block";
  resultBox.innerHTML = `
    <div class="table-card" style="text-align:center; padding:50px;">
      <i class="fa-solid fa-circle-check" style="font-size:50px; color:${passed ? "#34C759" : "#F59E0B"}; margin-bottom:20px;"></i>
      <h2 style="margin-bottom:10px;">Quiz Submitted</h2>
      <p style="color:#6B7280;">${title}</p>
      <p style="font-size:32px; font-weight:700; color:${passed ? "#34C759" : "#F59E0B"}; margin-top:20px;">${score}/${totalPoints} (${percent}%)</p>
      <p style="margin-top:16px; color:#6B7280;">
        ${attendance ? "✅ Attendance marked for this session." : "Attendance was not marked (either the window closed or the score was below 70%)."}
      </p>
    </div>
  `;

}

loadQuiz();