/*
=========================================
Purpose Institute Email Verification
=========================================
*/

(async () => {

    // Get the current authenticated user
    const { data: { user } } = await client.auth.getUser();

    // Not logged in = invalid or expired verification link
    if (!user) {

        document.getElementById("verifyTitle").textContent =
            "Verification Failed";

        document.getElementById("verifyMessage").textContent =
            "This verification link is invalid or has expired.";

        document.getElementById("successIcon").innerHTML = "✕";

        document.getElementById("successIcon").style.background =
            "#E53935";

        document.getElementById("loginBtn").textContent =
            "Back to Login";

        return;
    }

    // Verification successful
    await client.auth.signOut();

})();