/*
==========================================
Purpose Institute Student Dashboard
==========================================
*/

/* -----------------------------
Greeting
------------------------------*/

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning,";
  if (hour < 17) return "Good Afternoon,";
  return "Good Evening,";
}

/* -----------------------------
Load Student
------------------------------*/

async function loadStudent() {

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await client
    .from("students")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data) {
    console.error(error);
    alert("Unable to load student profile.");
    return;
  }

  document.getElementById("welcomeMessage").textContent = getGreeting();
  document.getElementById("studentName").textContent = `${data.first_name} ${data.last_name}`;
  document.getElementById("matric").textContent = data.matric_number || "Pending Assignment";

  if (data.group_number) {

    const { data: group } = await client
      .from("student_groups")
      .select("whatsapp_link")
      .eq("cohort", data.cohort)
      .eq("group_number", data.group_number)
      .maybeSingle();

    const panel = document.getElementById("groupPanel");
    const content = document.getElementById("groupContent");

    panel.style.display = "block";

    content.innerHTML = `
      <p style="margin-bottom: 12px;">You're in <strong>Group ${data.group_number}</strong>.</p>
      ${
        group?.whatsapp_link
          ? `<a href="${group.whatsapp_link}" target="_blank" class="group-link-btn">
               <i class="fa-brands fa-whatsapp"></i> Join Group Chat
             </a>`
          : `<p style="color: var(--muted);">Group chat link not set yet — check back soon.</p>`
      }
    `;

  }

}

/* -----------------------------
Today's Schedule
------------------------------*/

async function loadSchedule() {

  const today = new Date().toISOString().split("T")[0];

  const { data: sessions, error } = await client
    .from("course_sessions")
    .select("*, courses(course_code, status)")
    .eq("scheduled_date", today)
    .order("start_time", { ascending: true });

  const box = document.getElementById("scheduleList");

  if (error || !sessions) {
    box.innerHTML = `<p>Unable to load today's schedule.</p>`;
    return;
  }

  const todaysClasses = sessions.filter(s => s.courses?.status === "Published");

  if (todaysClasses.length === 0) {
    box.innerHTML = `<p>No classes scheduled today.</p>`;
    return;
  }

  box.innerHTML = todaysClasses.map(s => `
    <div class="schedule-item">
      <span class="schedule-time">${s.start_time ? s.start_time.slice(0, 5) : "-"}</span>
      <div>
        <strong>${s.courses.course_code}</strong> — ${s.title}
      </div>
    </div>
  `).join("");

}

/* -----------------------------
Today's Announcements
(also shown in the notification
bell dropdown, injected by the shell)
------------------------------*/

async function loadAnnouncements() {

  const { data, error } = await client
    .from("course_announcements")
    .select("*, courses(course_code, status)")
    .order("created_at", { ascending: false });

  const box = document.getElementById("announcementsList");

  if (error || !data) {
    box.innerHTML = `<p>Unable to load announcements.</p>`;
    return;
  }

  const today = new Date().toDateString();

  const todays = data.filter(a =>
    a.courses?.status === "Published" &&
    new Date(a.created_at).toDateString() === today
  );

  if (todays.length === 0) {
    box.innerHTML = `<p>No announcements at the moment.</p>`;
    return;
  }

  box.innerHTML = todays.map(a => `
    <div class="announcement-item">
      <span class="announcement-course">${a.courses.course_code}</span>
      <strong>${a.title}</strong>
      <p>${a.message}</p>
    </div>
  `).join("");

}

/* -----------------------------
Start
------------------------------*/

loadStudent();
loadSchedule();
loadAnnouncements();