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
Push Notifications
------------------------------*/

// Paste your VAPID PUBLIC key here (from `npx web-push generate-vapid-keys`)
const VAPID_PUBLIC_KEY = "BAPIN3CIeEqQfJYWybqcOUf3U5FDXRnnNHcMzRHVQQ0fgQLbo5crp_sLMZNAnQ2mCwWpdfWs6DLrsPUzb4YR_8E";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function checkNotificationStatus() {

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    document.getElementById("notifPanel").style.display = "none";
    return;
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return;

  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    document.getElementById("notifContent").innerHTML = `<p>✅ Daily reminders are on.</p>`;
  }

}

document.getElementById("enableNotifBtn").addEventListener("click", async () => {

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Push notifications aren't supported on this browser.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    alert("Notifications were not enabled.");
    return;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  const { data: { user } } = await client.auth.getUser();
  const { data: student } = await client
    .from("students")
    .select("student_id")
    .eq("auth_user_id", user.id)
    .single();

  const subJson = subscription.toJSON();

  const { error } = await client
    .from("push_subscriptions")
    .upsert({
      student_id: student.student_id,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth
    }, { onConflict: "student_id,endpoint" });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("notifContent").innerHTML = `<p>✅ Daily reminders are on.</p>`;

});

/* -----------------------------
Start
------------------------------*/

loadStudent();
loadSchedule();
loadAnnouncements();
checkNotificationStatus();