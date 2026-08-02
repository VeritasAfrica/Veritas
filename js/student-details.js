/*
=========================================
VALMS STUDENT DETAILS
=========================================
*/

const params=new URLSearchParams(window.location.search);

const studentId=params.get("id");

if(!studentId){

alert("Student not found.");

window.location.href="students.html";

}

/* ==========================
Load Logged-in Admin
========================== */

async function loadAdmin(){

const{

data:{user}

}=await client.auth.getUser();

if(!user){

window.location.href="login.html";

return;

}

const{

data

}=await client

.from("students")

.select("*")

.eq("auth_user_id",user.id)

.single();

if(data){

document.getElementById("adminName").textContent=data.full_name;

const initials=

(data.first_name[0]+data.last_name[0]).toUpperCase();

document.getElementById("adminAvatar").textContent=initials;

}

}

/* ==========================
Load Student
========================== */

async function loadStudent(){

const{

data,

error

}=await client

.from("students")

.select("*")

.eq("student_id",studentId)

.single();

if(error){

alert("Student not found.");

window.location.href="students.html";

return;

}

document.getElementById("studentFullName").textContent=data.full_name;

document.getElementById("studentMatric").textContent=

data.matric_number||"Pending Assignment";

const initials=

(data.first_name[0]+data.last_name[0]).toUpperCase();

document.getElementById("studentAvatar").textContent=initials;

document.getElementById("first_name").value=data.first_name;

document.getElementById("middle_name").value=data.middle_name||"";

document.getElementById("last_name").value=data.last_name;

document.getElementById("email").value=data.email;

document.getElementById("phone").value=data.phone;

document.getElementById("country").value=data.country;

document.getElementById("admission_year").value=data.admission_year;

document.getElementById("cohort").value=data.cohort;

document.getElementById("matric_number").value=

data.matric_number||"Pending Assignment";

}

/* ==========================
Save Student
========================== */

document.getElementById("saveStudent")

.addEventListener("click",async()=>{

const{

error

}=await client

.from("students")

.update({

first_name:document.getElementById("first_name").value,

middle_name:document.getElementById("middle_name").value,

last_name:document.getElementById("last_name").value,

full_name:
`${document.getElementById("first_name").value} ${document.getElementById("middle_name").value} ${document.getElementById("last_name").value}`.replace(/\s+/g," ").trim(),

email:document.getElementById("email").value,

phone:document.getElementById("phone").value,

country:document.getElementById("country").value,

admission_year:document.getElementById("admission_year").value,

cohort:document.getElementById("cohort").value

})

.eq("student_id",studentId);

if(error){

alert(error.message);

return;

}

alert("Student updated successfully.");

loadStudent();

});

/* ==========================
Delete Student
========================== */

document.getElementById("deleteStudent").addEventListener("click", async () => {

const confirmed = confirm("Delete this student?");

if (!confirmed) return;

console.log("Deleting Student ID:", studentId);

const { data, error } = await client
.from("students")
.delete()
.eq("student_id", studentId)
.select();

console.log("DELETE DATA:", data);
console.log("DELETE ERROR:", error);

if (error) {
alert(error.message);
return;
}

alert("Student deleted.");

window.location.href = "students.html";

});

/* ==========================
Reset Password
========================== */

document.getElementById("resetPassword")

.addEventListener("click",()=>{

alert("Password reset module will be connected later.");

});

/* ==========================
Start
========================== */

loadAdmin();

loadStudent();