/*
=========================================
VALMS Authentication
=========================================
*/

/* -----------------------------
Register
------------------------------*/

async function registerStudent(student) {

    const { data, error } = await client.auth.signUp({
        email: student.email,
        password: student.password,

        options: {

            emailRedirectTo:
                "http://127.0.0.1:5500/verified.html",

            data: {
                first_name: student.firstName,
                middle_name: student.middleName,
                last_name: student.lastName,
                phone: student.phone,
                country: student.country
            }
        }
    });

    return { data, error };

}

/* -----------------------------
Login
------------------------------*/
async function loginStudent(email, password) {

    const { data, error } =
    await client.auth.signInWithPassword({
        email,
        password
    });

    return { data, error };
}

/* -----------------------------
Logout
------------------------------*/
async function logoutStudent() {
    return await client.auth.signOut();
}

/* -----------------------------
Current User
------------------------------*/

async function getCurrentUser() {
    return await client.auth.getUser();
}

/* -----------------------------
Current Session
------------------------------*/

async function getCurrentSession() {
    return await client.auth.getSession();
}

/* -----------------------------
Get Student Profile
------------------------------*/

async function getStudentProfile(userId){
    return await client
    .from("students")
    .select("*")
    .eq("auth_user_id", userId)
    .single();
}