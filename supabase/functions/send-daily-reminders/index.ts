// supabase/functions/send-daily-reminders/index.ts
//
// Sends both a push notification and an email to every student
// who has at least one session today, respecting department
// targeting (same rules as the course list filtering).
//
// Deploy with: supabase functions deploy send-daily-reminders --no-verify-jwt
//
// Required secrets (set via `supabase secrets set KEY=value`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-available)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   REMINDER_CRON_SECRET
//   BREVO_API_KEY
//   SENDER_EMAIL, SENDER_NAME

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

Deno.serve(async (req) => {

  const authHeader = req.headers.get("x-cron-secret");
  if (authHeader !== Deno.env.get("REMINDER_CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );

  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
  const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL")!;
  const SENDER_NAME = Deno.env.get("SENDER_NAME")!;

  const today = new Date().toISOString().split("T")[0];

  /* ==========================
  Today's sessions, with course
  status + department tags
  ========================== */

  const { data: sessions } = await supabase
    .from("course_sessions")
    .select(`
      title, start_time,
      courses(course_code, status, course_departments(department))
    `)
    .eq("scheduled_date", today);

  // PostgREST can return an embedded to-one relationship as either an
  // object or a single-item array depending on how it infers the FK —
  // normalize it here so the rest of the function doesn't have to care.
  const normalized = (sessions || []).map(s => ({
    ...s,
    courses: Array.isArray(s.courses) ? s.courses[0] : s.courses
  }));

  const todaysSessions = normalized.filter(s => s.courses?.status === "Published");

  /* ==========================
  All active students
  (skip restricted accounts and admins)
  ========================== */

  const { data: students } = await supabase
    .from("students")
    .select("student_id, email, first_name, department")
    .eq("role", "student")
    .eq("is_restricted", false);

  /* ==========================
  Push subscriptions, keyed by student_id
  ========================== */

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*");

  const subsByStudent = {};
  (subscriptions || []).forEach(sub => {
    if (!subsByStudent[sub.student_id]) subsByStudent[sub.student_id] = [];
    subsByStudent[sub.student_id].push(sub);
  });

  let emailsSent = 0;
  let pushSent = 0;
  let failed = 0;
  const emailErrors = [];

  for (const student of students || []) {

    // Same visibility rule as the course list: "All" sees everything,
    // untagged courses stay visible, otherwise must match exactly.
    const mySessions = todaysSessions.filter(s => {
      const tags = s.courses?.course_departments || [];
      if (student.department === "All") return true;
      if (tags.length === 0) return true;
      return tags.some(t => t.department === student.department);
    });

    if (mySessions.length === 0) continue; // nothing to remind them about today

    const scheduleLines = mySessions
      .map(s => `• ${s.courses.course_code} — ${s.title}${s.start_time ? ` at ${s.start_time.slice(0, 5)}` : ""}`)
      .join("\n");

    /* ---------- Email via Brevo ---------- */

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: { email: SENDER_EMAIL, name: SENDER_NAME },
          to: [{ email: student.email, name: student.first_name }],
          subject: `Today's Schedule — ${mySessions.length} class${mySessions.length > 1 ? "es" : ""}`,
          textContent: `Hi ${student.first_name},\n\nHere's what's on today:\n\n${scheduleLines}\n\nSee you there!`
        })
      });

      if (res.ok) {
        emailsSent++;
      } else {
        const errBody = await res.text();
        console.error(`Brevo error for ${student.email}:`, res.status, errBody);
        emailErrors.push({ email: student.email, status: res.status, body: errBody });
        failed++;
      }
    } catch (err) {
      console.error(`Fetch error for ${student.email}:`, err.message);
      emailErrors.push({ email: student.email, error: err.message });
      failed++;
    }

    /* ---------- Push (only if subscribed) ---------- */

    const mySubs = subsByStudent[student.student_id] || [];

    for (const sub of mySubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: `Good morning, ${student.first_name}!`,
            body: `You have ${mySessions.length} class${mySessions.length > 1 ? "es" : ""} today. Tap to view.`,
            url: "/dashboard.html"
          })
        );
        pushSent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("subscription_id", sub.subscription_id);
        }
      }
    }

  }

  return new Response(JSON.stringify({ emailsSent, pushSent, failed, emailErrors }), {
    headers: { "Content-Type": "application/json" }
  });

});