/*
=========================================
Purpose Institute Login
=========================================
*/

const form = document.getElementById("loginForm");

const email = document.getElementById("email");

const password = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");

const message = document.getElementById("message");

const togglePassword = document.getElementById("togglePassword");

/* ---------------------------------
Show / Hide Password
----------------------------------*/

togglePassword.addEventListener("click", () => {

    const icon = togglePassword.querySelector("i");

    if (password.type === "password") {
        password.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");

    } else {
        password.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }

});

/* ---------------------------------
Already Logged In?
----------------------------------*/
/*
(async () => {

    const {
        data: { session }
    } = await getCurrentSession();

    if (!session) return;

    const { data: student } =
        await getStudentProfile(session.user.id);

    if (!student) {
        window.location.href = "dashboard.html";
        return;
    }

    if (student.role === "admin") {
        window.location.href = "admin.html";
    } else {
        window.location.href = "dashboard.html";
    }

})();
*/
/* ---------------------------------
Login
----------------------------------*/

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.innerHTML = "";
    loginBtn.disabled = true;
    loginBtn.textContent = "Signing In...";

    const { data, error } = await loginStudent(
        email.value.trim().toLowerCase(),
        password.value
    );

    if (error) {

        loginBtn.disabled = false;
        loginBtn.textContent = "Login";

        if (error.message.toLowerCase().includes("invalid")) {

            message.style.color = "#e53935";

            message.innerHTML =
                "Incorrect email or password.";

        } else {
            message.style.color = "#e53935";
            message.innerHTML =
                error.message;
        }

        return;

    }

    /* ---------------------------------
    Restriction Check
    (must happen before the success
    message/redirect, not after)
    ----------------------------------*/

    const { data: student } =
        await getStudentProfile(data.user.id);

    if (student?.is_restricted) {

        await client.auth.signOut();

        loginBtn.disabled = false;
        loginBtn.textContent = "Login";

        message.style.color = "#e53935";
        message.innerHTML =
            "Your account access has been restricted. Contact the administrator.";

        return;

    }

    loginBtn.disabled = false;
    loginBtn.textContent = "Login";

    message.style.color = "#28a745";

    message.innerHTML =
        "✅ Welcome back! Redirecting...";

    setTimeout(() => {

        if (student && student.role === "admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "dashboard.html";
        }
    }, 1000);
});