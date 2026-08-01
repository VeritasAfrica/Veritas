/*
==========================================
VALMS Student Profile
==========================================
*/

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");
const logoutBtn = document.getElementById("logoutBtn");

/* -----------------------------
Mobile Menu
------------------------------*/
menuBtn.addEventListener("click", () => {
    sidebar.classList.add("show");
    overlay.classList.add("show");
});

overlay.addEventListener("click", () => {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
});

/* -----------------------------
Load Profile
------------------------------*/
async function loadProfile() {
    const {
        data: { user }
    } = await client.auth.getUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data, error } = await client
        .from("students")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

    if (error) {
        console.error(error);
        alert("Unable to load student profile.");
        return;
    }

    /* -----------------------------
    Avatar
    ------------------------------*/
    const initials =
        (data.first_name[0] + data.last_name[0]).toUpperCase();
    document.getElementById("topAvatar").textContent = initials;
    document.getElementById("profileAvatar").textContent = initials;

    /* -----------------------------
    Student Information
    ------------------------------*/
    document.getElementById("fullName").textContent =
        data.full_name ||
        `${data.first_name} ${data.last_name}`;

    document.getElementById("matricNumber").textContent =
        data.matric_number || "Pending Assignment";

    document.getElementById("email").textContent =
        data.email || "-";

    document.getElementById("phone").textContent =
        data.phone || "-";

    document.getElementById("country").textContent =
        data.country || "-";

    document.getElementById("admissionYear").textContent =
        data.admission_year || "Not Assigned";

    document.getElementById("cohort").textContent =
        data.cohort || "Not Assigned";

}

/* -----------------------------
Logout
------------------------------*/

logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await client.auth.signOut();
    window.location.href = "login.html";
});

/* -----------------------------
Start
------------------------------*/

loadProfile();