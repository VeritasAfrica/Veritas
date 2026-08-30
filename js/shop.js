/*
=========================================
Purpose Institute SHOP (STUDENT)
=========================================
*/

let allProducts = [];
let currentCategory = "";
let currentStudentId = null;

const gradients = [
  "linear-gradient(135deg, #34C759, #17A34A)",
  "linear-gradient(135deg, #3B82F6, #2563EB)",
  "linear-gradient(135deg, #F59E0B, #D97706)",
  "linear-gradient(135deg, #8B5CF6, #6D28D9)"
];

/* ==========================
Load Products
========================== */

async function loadProducts() {

  const { data: { user } } = await client.auth.getUser();
  if (user) {
    const { data: student } = await client
      .from("students")
      .select("student_id")
      .eq("auth_user_id", user.id)
      .single();
    currentStudentId = student?.student_id || null;
  }

  const { data, error } = await client
    .from("shop_products")
    .select("*")
    .eq("status", "Active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  allProducts = data || [];
  renderProducts(allProducts);

}

/* ==========================
Render
========================== */

function renderProducts(products) {

  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  if (products.length === 0) {
    grid.innerHTML = `<p style="color:#94A3B8; grid-column:1/-1; text-align:center; padding:40px;">No products found.</p>`;
    return;
  }

  products.forEach((p, i) => {

    const imageContent = p.image_url
      ? `<img src="${p.image_url}" alt="${p.title}">`
      : `<span class="fallback">${p.title}</span>`;

    grid.innerHTML += `
      <div class="product-card">
        <div class="product-image" style="${p.image_url ? "" : `background:${gradients[i % gradients.length]}`}">
          ${p.is_verified ? `<span class="vendor-badge"><i class="fa-solid fa-circle-check"></i> Verified Partner</span>` : ""}
          ${imageContent}
        </div>
        <div class="product-body">
          <div class="product-title">${p.title}</div>
          <div class="product-desc">${p.description || ""}</div>
          <div class="product-footer">
            <div class="price">${p.price || ""}</div>
            <button class="buy-btn" onclick="buyProduct(${p.product_id})">
              Buy Now <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </button>
          </div>
        </div>
      </div>
    `;

  });

}

/* ==========================
Buy — logs the click, tags the
outbound link, then redirects
========================== */

async function buyProduct(productId) {

  const product = allProducts.find(p => p.product_id === productId);
  if (!product) return;

  // Log the click first (best-effort — don't block the redirect if this fails)
  client.from("shop_clicks").insert({
    product_id: productId,
    student_id: currentStudentId
  }).then(({ error }) => {
    if (error) console.error("Click log failed:", error);
  });

  // Tag the outbound link so the vendor's own analytics can attribute
  // traffic back to Purpose Institute, since we can't see their sales directly.
  const separator = product.vendor_url.includes("?") ? "&" : "?";
  const taggedUrl = `${product.vendor_url}${separator}utm_source=purposeinstitute&utm_medium=shop&utm_campaign=student_shop`;

  window.open(taggedUrl, "_blank");

}

/* ==========================
Category Filter
========================== */

document.querySelectorAll("#catTabs button").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#catTabs button").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    currentCategory = this.dataset.cat;
    applyFilters();
  });
});

/* ==========================
Search
========================== */

document.getElementById("searchProduct").addEventListener("keyup", applyFilters);

function applyFilters() {

  const keyword = document.getElementById("searchProduct").value.toLowerCase();

  const filtered = allProducts.filter(p => {
    const matchesCategory = !currentCategory || p.category === currentCategory;
    const matchesKeyword = p.title.toLowerCase().includes(keyword) || (p.description || "").toLowerCase().includes(keyword);
    return matchesCategory && matchesKeyword;
  });

  renderProducts(filtered);

}

/* ==========================
Start
========================== */

loadProducts();