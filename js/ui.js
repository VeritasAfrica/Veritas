/*
=========================================
VALMS UI
=========================================
*/

const passwordInput = document.getElementById("password");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");

document.querySelectorAll(".toggle-password").forEach(button => {

    button.addEventListener("click", () => {

        const target =
            document.getElementById(button.dataset.target);

        if(target.type === "password"){
            target.type = "text";
            button.innerHTML =
                '<i class="fa-solid fa-eye-slash"></i>';
        }else{
            target.type = "password";
            button.innerHTML =
                '<i class="fa-solid fa-eye"></i>';
        }

    });

});

passwordInput.addEventListener("input", () => {

    const value = passwordInput.value;

    let score = 0;

    if(value.length >= 8) score++;
    if(/[A-Z]/.test(value)) score++;
    if(/[a-z]/.test(value)) score++;
    if(/\d/.test(value)) score++;
    if(/[^A-Za-z0-9]/.test(value)) score++;

    strengthBar.style.width = `${score*20}%`;

    if(score<=2){
        strengthBar.style.background="#dc3545";
        strengthText.textContent="Weak Password";
    }
    else if(score<=4){
        strengthBar.style.background="#ffc107";
        strengthText.textContent="Medium Password";
    }
    else{
        strengthBar.style.background="#28a745";
        strengthText.textContent="Strong Password";
    }

});