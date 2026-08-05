/*
=========================================
VALMS STUDENT ANNOUNCEMENTS
=========================================
*/

const params = new URLSearchParams(window.location.search);
const courseId = params.get("course");

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
Load Announcements
========================== */

async function loadAnnouncements() {

  // Pull the course title/code alongside each announcement via the FK
  // relationship, so a global feed can tag which course each item is from.
  let query = client
    .from("course_announcements")
    .select("*, courses(course_title, course_code)")
    .order("created_at", { ascending: false });

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return;
  }

  // Adjust the header depending on whether this is a global feed
  // or scoped to one course.
  if (courseId && data.length > 0 && data[0].courses) {
    document.getElementById("pageTitle").textContent =
      `${data[0].courses.course_title} — Announcements`;
    document.getElementById("pageSubtitle").textContent =
      `Updates for ${data[0].courses.course_code}`;
  } else {
    document.getElementById("pageTitle").textContent = "Announcements";
    document.getElementById("pageSubtitle").textContent = "Latest updates from your courses";
  }

  const container = document.getElementById("announcementList");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
      <div class="table-card">
        No announcements yet.
      </div>
    `;
    return;
  }

  data.forEach(item => {

    // Only show the course tag in the global feed — pointless to repeat
    // it on every card when the page is already scoped to one course.
    const courseTag = (!courseId && item.courses)
      ? `<span class="status active" style="margin-bottom:10px; display:inline-block;">
           ${item.courses.course_code}
         </span><br>`
      : "";

    container.innerHTML += `
      <div class="table-card" style="margin-bottom: 20px;">
        ${courseTag}
        <h3>${item.title}</h3>
        <p style="margin-top: 10px; color: #4B5563;">${item.message}</p>
        <small style="color: #94A3B8; display: block; margin-top: 12px;">
          ${new Date(item.created_at).toLocaleString()}
        </small>
      </div>
    `;

  });

}

/* ==========================
Start
========================== */

loadAvatar();
loadAnnouncements();