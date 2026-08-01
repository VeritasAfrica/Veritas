/*
==========================================
VALMS Student Dashboard
==========================================
*/

/* -----------------------------
Elements
------------------------------*/

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");
const avatarBtn = document.getElementById("avatarBtn");
const profileMenu = document.getElementById("profileMenu");

/* -----------------------------
Greeting
------------------------------*/
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return "Good Morning,";
    }

    if (hour < 17) {
        return "Good Afternoon,";
    }

    return "Good Evening,";
}

/* -----------------------------
Mobile Sidebar
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
Avatar Dropdown
------------------------------*/
avatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("show");
});

document.addEventListener("click", () => {
    profileMenu.classList.remove("show");
});

/* -----------------------------
Load Student
------------------------------*/
async function loadStudent() {
    const {
        data: { user }
    } = await client.auth.getUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    console.log("Logged in User ID:", user.id);

    const { data, error } = await client
        .from("students")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

    console.log("Student:", data);
    console.log("First Name:", data.first_name);
    console.log("Last Name:", data.last_name);
    console.log("Error:", error);

    if (error) {
        console.error(error);
        alert("Unable to load student profile.");
        return;
    }

    /* Greeting */

    document.getElementById("welcomeMessage").textContent =
        getGreeting();

    /* Student Name */

    document.getElementById("studentName").textContent =
        `${data.first_name} ${data.last_name}`;

    document.getElementById("matric").textContent =
        data.matric_number || "Pending Assignment";    

    /* Matric Number */

    document.getElementById("matric").textContent =
        data.matric_number || "Pending Assignment";

    /* Avatar */

    const initials =
        (data.first_name[0] + data.last_name[0]).toUpperCase();
    document.querySelector(".avatar").textContent = initials;


}

/* -----------------------------
Logout
------------------------------*/

document.querySelectorAll(".logoutBtn").forEach(button => {
    button.addEventListener("click", async (e) => {
        e.preventDefault();
        await client.auth.signOut();
        window.location.href = "login.html";
    });
});

/* -----------------------------
Initialize
------------------------------*/

loadStudent();