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
    .select("*, quiz_questions(*)")
    .eq("quiz_id", quizId)
    .eq("status", "Published")
    .single();

  if (error || !quiz) {
    alert("Quiz not found or not available.");
    window.location.href = "student-courses.html";
    return;
  }

  // Already submitted? Show the result instead of the form.
  const { data: existing } = await client
    .from("quiz_submissions")
    .select("score")
    .eq("quiz_id", quizId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    showResult(existing.score, quiz.title);
    return;
  }

  document.querySelector(".topbar h2").textContent = quiz.title;
  document.getElementById("quizDescription").textContent = quiz.description || "";

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
    alert(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Quiz";
    return;
  }

  showResult(data.score, document.querySelector(".topbar h2").textContent);

});

function showResult(score, title) {

  document.getElementById("quizForm").style.display = "none";

  const resultBox = document.getElementById("resultBox");
  resultBox.style.display = "block";
  resultBox.innerHTML = `
    <div class="table-card" style="text-align:center; padding:50px;">
      <i class="fa-solid fa-circle-check" style="font-size:50px; color:#34C759; margin-bottom:20px;"></i>
      <h2 style="margin-bottom:10px;">Quiz Submitted</h2>
      <p style="color:#6B7280;">${title}</p>
      <p style="font-size:32px; font-weight:700; color:#34C759; margin-top:20px;">${score} points</p>
    </div>
  `;

}

loadQuiz();