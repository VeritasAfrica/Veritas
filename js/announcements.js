/*
=========================================
Purpose Institute ANNOUNCEMENTS (ADMIN)
=========================================
*/

let allAnnouncements = [];
let allCourses = [];

/* ==========================
Load Courses (for dropdowns)
========================== */

async function loadCourses() {

  const { data, error } = await client
    .from("courses")
    .select("course_id, course_code, course_title")
    .order("course_code");

  if (error) {
    console.error(error);
    return;
  }

  allCourses = data;

  const courseSelect = document.getElementById("courseSelect");
  const filterCourse = document.getElementById("filterCourse");

  data.forEach(c => {
    const label = `${c.course_code} — ${c.course_title}`;
    courseSelect.innerHTML += `<option value="${c.course_id}">${label}</option>`;
    filterCourse.innerHTML += `<option value="${c.course_id}">${c.course_code}</option>`;
  });

}

/* ==========================
Post Announcement
========================== */

document.getElementById("postBtn").addEventListener("click", async () => {

  const courseId = document.getElementById("courseSelect").value;
  const title = document.getElementById("announcementTitle").value.trim();
  const message = document.getElementById("announcementMessage").value.trim();
  const msg = document.getElementById("postMessage");

  if (!courseId || !title || !message) {
    msg.style.color = "#EF4444";
    msg.textContent = "Course, title, and message are all required.";
    return;
  }

  const { error } = await client
    .from("course_announcements")
    .insert({ course_id: courseId, title, message });

  if (error) {
    msg.style.color = "#EF4444";
    msg.textContent = error.message;
    return;
  }

  msg.style.color = "#16A34A";
  msg.textContent = "Announcement posted.";

  document.getElementById("announcementTitle").value = "";
  document.getElementById("announcementMessage").value = "";

  loadAnnouncements();

});

/* ==========================
Load All Announcements
========================== */

async function loadAnnouncements() {

  const { data, error } = await client
    .from("course_announcements")
    .select("*, courses(course_id, course_code, course_title)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  allAnnouncements = data;
  renderAnnouncements(data);

}

function renderAnnouncements(list) {

  const table = document.getElementById("announcementsTable");
  table.innerHTML = "";

  if (list.length === 0) {
    table.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">No announcements yet.</td></tr>`;
    return;
  }

  list.forEach(a => {
    table.innerHTML += `
      <tr>
        <td><strong>${a.courses?.course_code || "-"}</strong></td>
        <td>${a.title}</td>
        <td>${a.message.length > 60 ? a.message.slice(0, 60) + "..." : a.message}</td>
        <td>${new Date(a.created_at).toLocaleDateString()}</td>
        <td>
          <button class="delete-btn" onclick="deleteAnnouncement(${a.announcement_id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

}

async function deleteAnnouncement(id) {

  const confirmed = confirm("Delete this announcement?");
  if (!confirmed) return;

  const { error } = await client
    .from("course_announcements")
    .delete()
    .eq("announcement_id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadAnnouncements();

}

/* ==========================
Search + Filter
========================== */

function applyFilters() {

  const keyword = document.getElementById("searchAnnouncement").value.toLowerCase();
  const courseId = document.getElementById("filterCourse").value;

  const filtered = allAnnouncements.filter(a => {
    const matchesKeyword =
      a.title.toLowerCase().includes(keyword) ||
      a.message.toLowerCase().includes(keyword);
    const matchesCourse = !courseId || a.courses?.course_id == courseId;
    return matchesKeyword && matchesCourse;
  });

  renderAnnouncements(filtered);

}

document.getElementById("searchAnnouncement").addEventListener("keyup", applyFilters);
document.getElementById("filterCourse").addEventListener("change", applyFilters);

/* ==========================
Start
========================== */

loadCourses();
loadAnnouncements();