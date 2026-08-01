(async () => {

    const { data } = await client.auth.getSession();

    if (!data.session) return;

    // User has just verified their email

    if (sessionStorage.getItem("emailVerified")) return;

    sessionStorage.setItem("emailVerified", "true");

    window.location.href = "verified.html";

})();