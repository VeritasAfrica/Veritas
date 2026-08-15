/*
=========================================
Purpose Institute Validation
=========================================
*/

function validateEmail(email) {

    const regex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);

}

function validatePhone(phone){

    const regex =
        /^[+()\- 0-9]{7,20}$/;

    return regex.test(phone);

}

function validatePassword(password){

    const regex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&^()_\-+=]).{8,}$/;

    return regex.test(password);

}