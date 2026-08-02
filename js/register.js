/*
=========================================
VALMS Registration
=========================================
*/

const form = document.getElementById("registerForm");

const message =
    document.getElementById("message");

const submitBtn =
    document.getElementById("submitBtn");

form.addEventListener("submit", async(e)=>{

e.preventDefault();

message.innerHTML="";
message.style.color="";

const student={
firstName:capitalize(document.getElementById("first_name").value),
middleName:capitalize(document.getElementById("middle_name").value),
lastName:capitalize(document.getElementById("last_name").value),
email:document.getElementById("email").value.trim().toLowerCase(),
phone:document.getElementById("phone").value.trim(),
country:document.getElementById("country").value,
password:document.getElementById("password").value,
confirm:document.getElementById("confirm_password").value
};

if(!validateEmail(student.email)){
message.style.color="red";
message.innerHTML="Invalid email address.";
return;
}

if(!validatePhone(student.phone)){
message.style.color="red";
message.innerHTML="Invalid phone number.";
return;
}

if(!validatePassword(student.password)){
message.style.color="red";
message.innerHTML=
"Password must contain uppercase, lowercase, number and special character.";
return;
}

if(student.password!==student.confirm){
message.style.color="red";
message.innerHTML="Passwords do not match.";
return;
}

submitBtn.disabled=true;
submitBtn.textContent="Creating Account...";

const { data, error } = await registerStudent(student);

console.log("SIGNUP DATA:", data);
console.log("SIGNUP ERROR:", error);

console.log(data);
console.log(error);

submitBtn.disabled=false;
submitBtn.textContent="Create Account";

if(error){
message.style.color="red";
message.innerHTML=error.message;
console.error(error);
return;
}

const fullName =
`${student.firstName} ${
student.middleName ? student.middleName + " " : ""
}${student.lastName}`;

const { error: insertError } = await client
.from("students")
.insert({
    auth_user_id: data.user.id,
    full_name: fullName,
    first_name: student.firstName,
    middle_name: student.middleName || null,
    last_name: student.lastName,
    email: student.email,
    phone: student.phone,
    country: student.country,
    admission_year: new Date().getFullYear().toString(),
    cohort: "01",
    matric_number: null
});

/* if(insertError){
    console.error(insertError);
} */

if (insertError) {
    console.error(insertError);
    message.style.color = "red";
    message.innerHTML = insertError.message;
    return;
}

/* window.location.href =
`verify-email.html?email=${encodeURIComponent(student.email)}`; */

message.style.color = "#34C759";
message.innerHTML = "Account created successfully. Redirecting to login...";

setTimeout(() => {
    window.location.href = "login.html";
}, 1500);
}); 
