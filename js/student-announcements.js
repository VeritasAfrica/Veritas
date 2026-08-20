/*
=========================================
Purpose Institute STUDENT ANNOUNCEMENTS
=========================================
*/

const params = new URLSearchParams(window.location.search);
const courseId = params.get("course");

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
  const titleEl = document.querySelector(".topbar h2");
  const subtitleEl = document.querySelector(".page-subtitle");

  if (courseId && data.length > 0 && data[0].courses) {
    titleEl.textContent = `${data[0].courses.course_title} — Announcements`;
    subtitleEl.textContent = `Updates for ${data[0].courses.course_code}`;
  } else {
    titleEl.textContent = "Announcements";
    subtitleEl.textContent = "Latest updates from your courses";
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

loadAnnouncements();