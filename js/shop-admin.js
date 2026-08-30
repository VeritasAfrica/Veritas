/*
=========================================
Purpose Institute SHOP (ADMIN)
=========================================
*/

const form = document.getElementById("productForm");
const message = document.getElementById("message");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let editingId = null;
let existingImageUrl = null;
let pendingImageBlob = null;

/* ==========================
Resize + Compress Image
(keeps every upload small regardless
of the original file size)
========================== */

function resizeImage(file, maxWidth = 800, quality = 0.8) {
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

document.getElementById("imageFile").addEventListener("change", async (e) => {

  const file = e.target.files[0];
  if (!file) return;

  try {
    pendingImageBlob = await resizeImage(file);

    const previewUrl = URL.createObjectURL(pendingImageBlob);
    document.getElementById("imagePreview").src = previewUrl;
    document.getElementById("imagePreviewBox").style.display = "block";
  } catch (err) {
    alert("Couldn't process that image: " + err.message);
  }

});

/* ==========================
Load Products (with click counts)
========================== */

async function loadProducts() {

  const { data: products, error } = await client
    .from("shop_products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const { data: clicks } = await client
    .from("shop_clicks")
    .select("product_id");

  const clickCounts = {};
  (clicks || []).forEach(c => {
    clickCounts[c.product_id] = (clickCounts[c.product_id] || 0) + 1;
  });

  const table = document.getElementById("productTable");
  table.innerHTML = "";

  if (products.length === 0) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px;">No products listed yet.</td></tr>`;
    return;
  }

  products.forEach(p => {
    table.innerHTML += `
      <tr>
        <td><strong>${p.title}</strong>${p.is_verified ? ' <i class="fa-solid fa-circle-check" style="color:#34C759;" title="Verified Partner"></i>' : ''}</td>
        <td>${p.category || "-"}</td>
        <td>${p.price || "-"}</td>
        <td><span class="status ${p.status === "Active" ? "active" : "pending"}">${p.status}</span></td>
        <td>${clickCounts[p.product_id] || 0}</td>
        <td>
          <button class="view-btn" onclick="editProduct(${p.product_id})">Edit</button>
          <button class="delete-btn" onclick="deleteProduct(${p.product_id})">Delete</button>
        </td>
      </tr>
    `;
  });

}

/* ==========================
Edit
========================== */

async function editProduct(id) {

  const { data: p, error } = await client
    .from("shop_products")
    .select("*")
    .eq("product_id", id)
    .single();

  if (error || !p) {
    alert("Product not found.");
    return;
  }

  editingId = id;
  existingImageUrl = p.image_url;
  pendingImageBlob = null;

  document.getElementById("title").value = p.title;
  document.getElementById("description").value = p.description || "";
  document.getElementById("price").value = p.price || "";
  document.getElementById("category").value = p.category || "Merch";
  document.getElementById("vendorName").value = p.vendor_name || "";
  document.getElementById("vendorUrl").value = p.vendor_url;
  document.getElementById("isVerified").checked = p.is_verified;
  document.getElementById("status").value = p.status;
  document.getElementById("imageFile").value = "";

  if (p.image_url) {
    document.getElementById("imagePreview").src = p.image_url;
    document.getElementById("imagePreviewBox").style.display = "block";
  } else {
    document.getElementById("imagePreviewBox").style.display = "none";
  }

  document.getElementById("formTitle").textContent = "Edit Product";
  saveBtn.textContent = "Update Product";
  cancelEditBtn.style.display = "inline-flex";

  window.scrollTo({ top: 0, behavior: "smooth" });

}

cancelEditBtn.addEventListener("click", () => {
  editingId = null;
  existingImageUrl = null;
  pendingImageBlob = null;
  form.reset();
  document.getElementById("imagePreviewBox").style.display = "none";
  document.getElementById("formTitle").textContent = "Add Product";
  saveBtn.textContent = "Save Product";
  cancelEditBtn.style.display = "none";
});

/* ==========================
Delete
========================== */

async function deleteProduct(id) {

  const confirmed = confirm("Delete this product? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await client
    .from("shop_products")
    .delete()
    .eq("product_id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadProducts();

}

/* ==========================
Save (Create or Update)
========================== */

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  message.innerHTML = "";
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  // Upload the resized image if a new one was selected; otherwise
  // keep whatever image was already on this product (or null for new ones)
  let imageUrl = existingImageUrl;

  if (pendingImageBlob) {

    const filePath = `${Date.now()}-product.jpg`;

    const { error: uploadError } = await client.storage
      .from("shop-images")
      .upload(filePath, pendingImageBlob, { contentType: "image/jpeg" });

    if (uploadError) {
      saveBtn.disabled = false;
      saveBtn.textContent = editingId ? "Update Product" : "Save Product";
      message.style.color = "#EF4444";
      message.innerHTML = uploadError.message;
      return;
    }

    const { data: publicUrlData } = client.storage
      .from("shop-images")
      .getPublicUrl(filePath);

    imageUrl = publicUrlData.publicUrl;

  }

  const product = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    image_url: imageUrl,
    price: document.getElementById("price").value.trim() || null,
    category: document.getElementById("category").value,
    vendor_name: document.getElementById("vendorName").value.trim() || null,
    vendor_url: document.getElementById("vendorUrl").value.trim(),
    is_verified: document.getElementById("isVerified").checked,
    status: document.getElementById("status").value
  };

  let error;

  if (editingId) {
    ({ error } = await client.from("shop_products").update(product).eq("product_id", editingId));
  } else {
    ({ error } = await client.from("shop_products").insert(product));
  }

  saveBtn.disabled = false;
  saveBtn.textContent = editingId ? "Update Product" : "Save Product";

  if (error) {
    message.style.color = "#EF4444";
    message.innerHTML = error.message;
    return;
  }

  message.style.color = "#16A34A";
  message.innerHTML = editingId ? "Product updated." : "Product added.";

  editingId = null;
  existingImageUrl = null;
  pendingImageBlob = null;
  form.reset();
  document.getElementById("imagePreviewBox").style.display = "none";
  document.getElementById("formTitle").textContent = "Add Product";
  saveBtn.textContent = "Save Product";
  cancelEditBtn.style.display = "none";

  loadProducts();

});

loadProducts();