/*
=========================================
Purpose Institute CREATE / EDIT QUIZ
=========================================
*/

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session");

if (!sessionId) {
  alert("No session selected.");
  window.location.href = "courses.html";
}

let currentQuizId = null;

/* ==========================
Load Existing Quiz (if any)
========================== */

async function loadQuiz() {

  const { data: quiz } = await client
    .from("quizzes")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (quiz) {
    currentQuizId = quiz.quiz_id;
    document.getElementById("quizTitle").value = quiz.title;
    document.getElementById("quizDescription").value = quiz.description || "";
    document.getElementById("timeLimit").value = quiz.time_limit_minutes || "";
    document.getElementById("quizStatus").value = quiz.status;
    loadQuestions();
  }

}

/* ==========================
Save Quiz Details
========================== */

document.getElementById("saveQuizBtn").addEventListener("click", async () => {

  const title = document.getElementById("quizTitle").value.trim();

  if (!title) {
    alert("Quiz title is required.");
    return;
  }

  const payload = {
    session_id: sessionId,
    title,
    description: document.getElementById("quizDescription").value.trim() || null,
    time_limit_minutes: document.getElementById("timeLimit").value || null,
    status: document.getElementById("quizStatus").value
  };

  if (currentQuizId) {

    const { error } = await client
      .from("quizzes")
      .update(payload)
      .eq("quiz_id", currentQuizId);

    if (error) {
      alert(error.message);
      return;
    }

  } else {

    const { data, error } = await client
      .from("quizzes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    currentQuizId = data.quiz_id;

  }

  alert("Quiz details saved.");
  loadQuestions();

});

/* ==========================
Add Question
========================== */

document.getElementById("addQuestionBtn").addEventListener("click", () => {

  if (!currentQuizId) {
    alert("Save the quiz details first before adding questions.");
    return;
  }

  const list = document.getElementById("questionList");

  const formDiv = document.createElement("div");
  formDiv.className = "question-form";
  formDiv.innerHTML = `
    <div class="form-group">
      <label>Question</label>
      <input type="text" class="q-text" required>
    </div>

    <div class="option-grid">
      <div class="form-group">
        <label>Option A</label>
        <input type="text" class="q-option-a" required>
      </div>
      <div class="form-group">
        <label>Option B</label>
        <input type="text" class="q-option-b" required>
      </div>
      <div class="form-group">
        <label>Option C <span class="optional">(optional)</span></label>
        <input type="text" class="q-option-c">
      </div>
      <div class="form-group">
        <label>Option D <span class="optional">(optional)</span></label>
        <input type="text" class="q-option-d">
      </div>
    </div>

    <div style="display:flex; gap:20px; align-items:flex-end; flex-wrap:wrap;">
      <div class="form-group" style="max-width:180px;">
        <label>Correct Option</label>
        <select class="q-correct">
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
          <option value="d">D</option>
        </select>
      </div>

      <div class="form-group" style="max-width:120px;">
        <label>Points</label>
        <input type="number" class="q-points" value="1" min="1">
      </div>

      <button class="assign-btn save-question-btn" style="height:56px;">Save Question</button>
      <button class="delete-btn cancel-question-btn" style="height:56px;">Cancel</button>
    </div>
  `;

  list.prepend(formDiv);

  formDiv.querySelector(".cancel-question-btn").addEventListener("click", () => formDiv.remove());

  formDiv.querySelector(".save-question-btn").addEventListener("click", async () => {

    const question = {
      quiz_id: currentQuizId,
      question_text: formDiv.querySelector(".q-text").value.trim(),
      option_a: formDiv.querySelector(".q-option-a").value.trim(),
      option_b: formDiv.querySelector(".q-option-b").value.trim(),
      option_c: formDiv.querySelector(".q-option-c").value.trim() || null,
      option_d: formDiv.querySelector(".q-option-d").value.trim() || null,
      correct_option: formDiv.querySelector(".q-correct").value,
      points: parseInt(formDiv.querySelector(".q-points").value) || 1
    };

    if (!question.question_text || !question.option_a || !question.option_b) {
      alert("Question text, Option A, and Option B are required.");
      return;
    }

    const { error } = await client.from("quiz_questions").insert(question);

    if (error) {
      alert(error.message);
      return;
    }

    loadQuestions();

  });

});

/* ==========================
Load Questions
========================== */

async function loadQuestions() {

  const { data: questions, error } = await client
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", currentQuizId)
    .order("question_id", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const list = document.getElementById("questionList");
  const noQuestions = document.getElementById("noQuestions");

  // Keep any open "add question" form, only replace the rendered list items
  document.querySelectorAll(".question-item").forEach(el => el.remove());

  noQuestions.style.display = questions.length === 0 ? "block" : "none";

  questions.forEach((q, index) => {

    const options = [
      { key: "a", text: q.option_a },
      { key: "b", text: q.option_b },
      { key: "c", text: q.option_c },
      { key: "d", text: q.option_d }
    ].filter(o => o.text);

    const item = document.createElement("div");
    item.className = "question-item";
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <strong>${index + 1}. ${q.question_text}</strong>
          <ul style="margin-top:10px; padding-left:20px; color:#64748B;">
            ${options.map(o => `
              <li style="${o.key === q.correct_option ? "color:#16A34A; font-weight:600;" : ""}">
                ${o.key.toUpperCase()}) ${o.text} ${o.key === q.correct_option ? "✓" : ""}
              </li>
            `).join("")}
          </ul>
          <p style="color:#94A3B8; font-size:13px; margin-top:8px;">${q.points} point${q.points !== 1 ? "s" : ""}</p>
        </div>
        <button class="delete-btn" onclick="deleteQuestion(${q.question_id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    list.appendChild(item);

  });

}

async function deleteQuestion(questionId) {

  const confirmed = confirm("Delete this question?");
  if (!confirmed) return;

  const { error } = await client
    .from("quiz_questions")
    .delete()
    .eq("question_id", questionId);

  if (error) {
    alert(error.message);
    return;
  }

  loadQuestions();

}

/* ==========================
Start
========================== */

loadQuiz();