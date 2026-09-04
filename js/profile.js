/*
==========================================
Purpose Institute Student Profile
==========================================
*/

let currentUserId = null;

/* -----------------------------
Load Profile
------------------------------*/
async function loadProfile() {
    const {
        data: { user }
    } = await client.auth.getUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUserId = user.id;

    const { data, error } = await client
        .from("students")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

    if (error) {
        console.error(error);
        alert("Unable to load student profile.");
        return;
    }

    /* -----------------------------
    Avatar
    ------------------------------*/
    renderAvatar(data);

    /* -----------------------------
    Student Information
    ------------------------------*/
    document.getElementById("fullName").textContent =
        data.full_name ||
        `${data.first_name} ${data.last_name}`;

    document.getElementById("matricNumber").textContent =
        data.matric_number || "Pending Assignment";

    document.getElementById("email").textContent =
        data.email || "-";

    document.getElementById("phone").textContent =
        data.phone || "-";

    document.getElementById("country").textContent =
        data.country || "-";

    document.getElementById("admissionYear").textContent =
        data.admission_year || "Not Assigned";

    document.getElementById("cohort").textContent =
        data.cohort || "Not Assigned";

}

/* -----------------------------
Render Avatar (photo or initials)
------------------------------*/
function renderAvatar(data) {

    const initials = (data.first_name[0] + data.last_name[0]).toUpperCase();
    const profileAvatarEl = document.getElementById("profileAvatar");
    const topAvatarEl = document.getElementById("topAvatar");

    if (data.avatar_url) {

        profileAvatarEl.style.backgroundImage = `url(${data.avatar_url})`;
        profileAvatarEl.style.backgroundSize = "cover";
        profileAvatarEl.style.backgroundPosition = "center";
        profileAvatarEl.textContent = "";

        if (topAvatarEl) {
            topAvatarEl.style.backgroundImage = `url(${data.avatar_url})`;
            topAvatarEl.style.backgroundSize = "cover";
            topAvatarEl.style.backgroundPosition = "center";
            topAvatarEl.textContent = "";
        }

    } else {

        profileAvatarEl.style.backgroundImage = "";
        profileAvatarEl.textContent = initials;

        if (topAvatarEl) {
            topAvatarEl.style.backgroundImage = "";
            topAvatarEl.textContent = initials;
        }

    }

}

/* -----------------------------
Resize + Compress Image
(same approach used for shop images —
keeps every upload small automatically)
------------------------------*/
function resizeImage(file, maxWidth = 400, quality = 0.8) {
    return new Promise((resolve, reject) => {

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => { img.src = e.target.result; };
        reader.onerror = reject;

        img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error("Compression failed.")),
                "image/jpeg",
                quality
            );
        };
        img.onerror = reject;

        reader.readAsDataURL(file);

    });
}

/* -----------------------------
Change Photo
------------------------------*/

document.getElementById("changePhotoBtn").addEventListener("click", () => {
    document.getElementById("avatarFile").click();
});

document.getElementById("avatarFile").addEventListener("change", async (e) => {

    const file = e.target.files[0];
    if (!file || !currentUserId) return;

    const btn = document.getElementById("changePhotoBtn");
    btn.disabled = true;
    btn.textContent = "Uploading...";

    try {

        const resizedBlob = await resizeImage(file);
        const filePath = `${currentUserId}/photo.jpg`;

        const { error: uploadError } = await client.storage
            .from("avatars")
            .upload(filePath, resizedBlob, { contentType: "image/jpeg", upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = client.storage
            .from("avatars")
            .getPublicUrl(filePath);

        // Cache-bust so the new photo shows immediately instead of a
        // stale cached version at the same URL
        const freshUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

        const { error: updateError } = await client
            .from("students")
            .update({ avatar_url: freshUrl })
            .eq("auth_user_id", currentUserId);

        if (updateError) throw updateError;

        renderAvatar({
            avatar_url: freshUrl,
            first_name: document.getElementById("fullName").textContent.split(" ")[0] || "S",
            last_name: document.getElementById("fullName").textContent.split(" ")[1] || "B"
        });

    } catch (err) {
        alert("Couldn't update photo: " + err.message);
    }

    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-camera"></i> Change Photo`;

});

/* -----------------------------
Start
------------------------------*/

loadProfile();