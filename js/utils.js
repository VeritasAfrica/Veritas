/*
=========================================
VALMS Utilities
=========================================
*/

console.log("✅ utils.js loaded");

function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function getInitials(firstName, lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isEmpty(value) {
    return value.trim() === "";
}

function formatDate(date = new Date()) {
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}
