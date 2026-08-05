/*
=========================================
VALMS STUDENT SCHEDULE
=========================================
*/

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");
const logoutBtn = document.getElementById("logoutBtn");

/* ==========================
Mobile Menu
========================== */

menuBtn.addEventListener("click", () => {
  sidebar.classList.add("show");
  overlay.classList.add("show");
});

overlay.addEventListener("click", () => {
  sidebar.classList.remove("show");
  overlay.classList.remove("show");
});

/* ==========================
Logout
========================== */

logoutBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  await client.auth.signOut();
  window.location.href = "login.html";
});

/* ==========================
Load Avatar
========================== */

async function loadAvatar() {

  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  const { data } = await client
    .from("students")
    .select("first_name, last_name")
    .eq("auth_user_id", user.id)
    .single();

  if (data) {
    const initials = (data.first_name[0] + data.last_name[0]).toUpperCase();
    document.getElementById("topAvatar").textContent = initials;
  }

}

/* ==========================
Load Schedule
========================== */

async function loadSchedule() {

  // scheduled_date is a DATE column (no time component), so compare
  // against today's date as a plain YYYY-MM-DD string.
  const today = new Date().toISOString().split("T")[0];

  const { data: sessions, error } = await client
    .from("course_sessions")
    .select("*, courses(course_code, course_title)")
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const table = document.getElementById("scheduleTable");
  table.innerHTML = "";

  if (sessions.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px;">
          No upcoming classes.
        </td>
      </tr>
    `;
    return;
  }

  sessions.forEach(session => {

    const dateLabel = session.scheduled_date
      ? new Date(session.scheduled_date).toLocaleDateString()
      : "-";

    const timeLabel = session.start_time
      ? session.start_time.slice(0, 5)
      : "-";

    table.innerHTML += `
      <tr>
        <td>${dateLabel}</td>
        <td>${session.courses?.course_code ?? "-"}</td>
        <td>${session.title}</td>
        <td>${timeLabel}</td>
        <td>
          <button class="view-btn" onclick="window.location.href='student-material-view.html?id=${session.session_id}'">
            Open
          </button>
        </td>
      </tr>
    `;

  });

}

/* ==========================
Start
========================== */

loadAvatar();
loadSchedule();