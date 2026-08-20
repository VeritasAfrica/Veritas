/*
=========================================
VALMS ADMIN SHELL
Injects the sidebar + topbar on every admin
page, wires up mobile menu, logout, and
loads the admin's name/avatar.

Each page must define window.ADMIN_PAGE
BEFORE this script loads, e.g.:

  window.ADMIN_PAGE = {
    active: "courses",
    title: "Courses",
    subtitle: "Manage all Purpose Institute courses",
    search: { id: "pageSearch", placeholder: "Search course..." }
    // omit "search" if the page doesn't need one
  };
=========================================
*/

(function () {

  const config = window.ADMIN_PAGE || {};

  /* ==========================
  Sidebar Links
  (edit this ONE list to add/remove/reorder
  nav items across every admin page at once)
  ========================== */

  const navItems = [
    { key: "dashboard",   label: "Dashboard",   icon: "fa-chart-line",           href: "admin.html" },
    { key: "students",    label: "Students",    icon: "fa-user-graduate",        href: "students.html" },
    { key: "groups",      label: "Groups",       icon: "fa-users",                href: "groups.html" },
    { key: "courses",     label: "Courses",     icon: "fa-book",                 href: "courses.html" },
    { key: "attendance",  label: "Attendance",  icon: "fa-calendar-check",       href: "attendance.html" },
    { key: "results",     label: "Results",     icon: "fa-square-poll-vertical", href: "results.html" },
    { key: "announcements", label: "Announcements", icon: "fa-bullhorn",        href: "announcements.html" },
    { key: "settings",    label: "Settings",    icon: "fa-gear",                 href: "settings.html" }
  ];

  const navHtml = navItems.map(item => `
    <li class="${config.active === item.key ? "active" : ""}">
      <a href="${item.href}">
        <i class="fa-solid ${item.icon}"></i>
        <span>${item.label}</span>
      </a>
    </li>
  `).join("");

  /* ==========================
  Inject Sidebar
  ========================== */

  const sidebarMount = document.getElementById("sidebarMount");

  if (sidebarMount) {
    sidebarMount.outerHTML = `
      <aside class="sidebar" id="sidebar">

        <div class="logo">
          <h1>Purpose Institute</h1>
          <p>Administration Portal</p>
        </div>

        <ul class="menu">
          ${navHtml}
        </ul>

        <div class="sidebar-footer">
          <div class="profile">
            <div class="avatar" id="adminAvatar">A</div>
            <div>
              <h4 id="adminName">Administrator</h4>
              <p>Admin</p>
            </div>
          </div>

          <button id="logoutBtn">
            <i class="fa-solid fa-right-from-bracket"></i>
            Logout
          </button>
        </div>

      </aside>

      <div id="overlay"></div>
    `;
  }

  /* ==========================
  Inject Topbar
  ========================== */

  const topbarMount = document.getElementById("topbarMount");

  if (topbarMount) {
    topbarMount.outerHTML = `
      <header class="topbar">

        <div class="top-row">
          <div class="left-side">
            <button id="menuBtn" class="menu-btn">
              <i class="fa-solid fa-bars"></i>
            </button>

            <div>
              <h2 class="page-title">${config.title || ""}</h2>
              ${config.subtitle ? `<p>${config.subtitle}</p>` : ""}
            </div>
          </div>

          <div class="right-side">
            <button><i class="fa-regular fa-envelope"></i></button>
            <button><i class="fa-regular fa-bell"></i></button>
            <div class="admin-avatar" id="topAvatar">A</div>
          </div>
        </div>

        ${config.search ? `
          <div class="search">
            <i class="fa-solid fa-search"></i>
            <input type="text" id="${config.search.id}" placeholder="${config.search.placeholder}">
          </div>
        ` : ""}

      </header>
    `;
  }

  /* ==========================
  Mobile Menu Toggle
  ========================== */

  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const overlay = document.getElementById("overlay");

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.add("show");
      overlay.classList.add("show");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("show");
      overlay.classList.remove("show");
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) {
        sidebar.classList.remove("show");
        overlay.classList.remove("show");
      }
    });
  }

  /* ==========================
  Logout
  ========================== */

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await client.auth.signOut();
      window.location.href = "login.html";
    });
  }

  /* ==========================
  Load Admin Name / Avatar
  ========================== */

  async function loadAdmin() {

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const { data } = await client
      .from("students")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (!data || data.role !== "admin") {
      alert("You don't have access to this page.");
      window.location.href = "dashboard.html";
      return;
    }

    const firstInitial = data.first_name?.[0] ?? "";
    const lastInitial = data.last_name?.[0] ?? "";
    const initials = (firstInitial + lastInitial).toUpperCase() || "?";
    document.getElementById("adminName").textContent = data.full_name;
    document.getElementById("adminAvatar").textContent = initials;
    document.getElementById("topAvatar").textContent = initials;

  }

  loadAdmin();

  // Let the page's own script know the shell is ready,
  // in case it needs to wire up search or anything else
  // that depends on elements the shell just injected.
  document.dispatchEvent(new Event("adminShellReady"));

})();