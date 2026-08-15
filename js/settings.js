/*
=========================================
Purpose Institute SETTINGS
=========================================
*/

let currentUserId = null;

/* ==========================
Load Profile
========================== */

async function loadProfile() {

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUserId = user.id;

  const { data, error } = await client
    .from("students")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data) {
    console.error(error);
    return;
  }

  document.getElementById("firstName").value = data.first_name || "";
  document.getElementById("lastName").value = data.last_name || "";
  document.getElementById("email").value = data.email || "";
  document.getElementById("phone").value = data.phone || "";

}

/* ==========================
Save Profile
========================== */

document.getElementById("saveProfileBtn").addEventListener("click", async () => {

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();

  const { error } = await client
    .from("students")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      phone: document.getElementById("phone").value.trim()
    })
    .eq("auth_user_id", currentUserId);

  const msg = document.getElementById("profileMessage");

  if (error) {
    msg.style.color = "#EF4444";
    msg.textContent = error.message;
    return;
  }

  msg.style.color = "#16A34A";
  msg.textContent = "Profile updated successfully.";

});

/* ==========================
Change Password
========================== */

document.getElementById("changePasswordBtn").addEventListener("click", async () => {

  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const msg = document.getElementById("passwordMessage");

  if (!newPassword || newPassword.length < 8) {
    msg.style.color = "#EF4444";
    msg.textContent = "Password must be at least 8 characters.";
    return;
  }

  if (newPassword !== confirmPassword) {
    msg.style.color = "#EF4444";
    msg.textContent = "Passwords do not match.";
    return;
  }

  const { error } = await client.auth.updateUser({ password: newPassword });

  if (error) {
    msg.style.color = "#EF4444";
    msg.textContent = error.message;
    return;
  }

  msg.style.color = "#16A34A";
  msg.textContent = "Password updated successfully.";

  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";

});

/* ==========================
Load System Settings
========================== */

async function loadSystemSettings() {

  const { data, error } = await client
    .from("app_settings")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  const settings = {};
  data.forEach(row => settings[row.setting_key] = row.setting_value);

  document.getElementById("attendanceWindow").value = settings.attendance_window_minutes || "";
  document.getElementById("currentCohort").value = settings.current_cohort || "";
  document.getElementById("currentYear").value = settings.current_year || "";

}

/* ==========================
Save System Settings
========================== */

document.getElementById("saveSystemBtn").addEventListener("click", async () => {

  const updates = [
    { setting_key: "attendance_window_minutes", setting_value: document.getElementById("attendanceWindow").value },
    { setting_key: "current_cohort", setting_value: document.getElementById("currentCohort").value },
    { setting_key: "current_year", setting_value: document.getElementById("currentYear").value }
  ];

  const { error } = await client
    .from("app_settings")
    .upsert(updates, { onConflict: "setting_key" });

  const msg = document.getElementById("systemMessage");

  if (error) {
    msg.style.color = "#EF4444";
    msg.textContent = error.message;
    return;
  }

  msg.style.color = "#16A34A";
  msg.textContent = "System settings saved.";

});

/* ==========================
Start
========================== */

loadProfile();
loadSystemSettings();