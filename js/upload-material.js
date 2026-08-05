/*
=========================================
VALMS UPLOAD MATERIAL
=========================================
*/

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session");

if (!sessionId) {
  alert("No session selected.");
  window.location.href = "courses.html";
}

const form = document.getElementById("materialForm");
const message = document.getElementById("message");
const uploadBtn = document.getElementById("uploadBtn");
const logoutBtn = document.getElementById("logoutBtn");

const typeSelect = document.getElementById("type");
const fileGroup = document.getElementById("fileGroup");
const linkGroup = document.getElementById("linkGroup");
const fileInput = document.getElementById("file");
const linkInput = document.getElementById("link");

/* ==========================
Logout
========================== */

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    window.location.href = "login.html";
  });
}

/* ==========================
Toggle File vs Link Input
========================== */

typeSelect.addEventListener("change", () => {
  if (typeSelect.value === "Link") {
    fileGroup.style.display = "none";
    linkGroup.style.display = "block";
    fileInput.required = false;
  } else {
    fileGroup.style.display = "block";
    linkGroup.style.display = "none";
  }
});

/* ==========================
Save Material
========================== */

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  message.innerHTML = "";
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  const title = document.getElementById("title").value.trim();
  const fileType = typeSelect.value;
  const description = document.getElementById("description").value.trim();

  let fileUrl = null;

  if (fileType === "Link") {

    fileUrl = linkInput.value.trim();

    if (!fileUrl) {
      showError("Please provide an external link.");
      return;
    }

  } else {

    const file = fileInput.files[0];

    if (!file) {
      showError("Please choose a file to upload.");
      return;
    }

    const filePath = `${sessionId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await client.storage
      .from("session-materials")
      .upload(filePath, file);

    if (uploadError) {
      showError(uploadError.message);
      return;
    }

    const { data: publicUrlData } = client.storage
      .from("session-materials")
      .getPublicUrl(filePath);

    fileUrl = publicUrlData.publicUrl;

  }

  const { error } = await client
    .from("session_materials")
    .insert({
      session_id: sessionId,
      title,
      file_type: fileType,
      file_url: fileUrl,
      description: description || null
    });

  if (error) {
    showError(error.message);
    return;
  }

  message.style.color = "#16A34A";
  message.innerHTML = "Material uploaded successfully.";

  setTimeout(() => {
    window.location.href = `session-details.html?id=${sessionId}`;
  }, 800);

});

function showError(text) {
  uploadBtn.disabled = false;
  uploadBtn.textContent = "Upload Material";
  message.style.color = "#EF4444";
  message.innerHTML = text;
}