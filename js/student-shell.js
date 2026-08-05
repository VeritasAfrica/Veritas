/*
=========================================
VALMS STUDENT SHELL
Injects the sidebar + topbar on every
student-facing page, wires up mobile menu,
logout, and loads the student's avatar.

Each page must define window.STUDENT_PAGE
BEFORE this script loads, e.g.:

  window.STUDENT_PAGE = {
    active: "courses",
    title: "My Courses",
    subtitle: "Courses available this semester"
    // subtitle is optional, omit if not needed
  };
=========================================
*/

(function () {

  const config = window.STUDENT_PAGE || {};

  /* ==========================
  Sidebar Links
  (edit this ONE list to add/remove/reorder
  nav items across every student page at once)
  ========================== */

  const navItems = [
    { key: "dashboard",     label: "Dashboard",      icon: "fa-house",             href: "dashboard.html" },
    { key: "courses",       label: "My Courses",     icon: "fa-book",              href: "student-courses.html" },
    { key: "schedule",      label: "Schedule",       icon: "fa-calendar-days",     href: "student-schedule.html" },
    { key: "attendance",    label: "Attendance",     icon: "fa-calendar-check",    href: "student-attendance.html" },
    { key: "results",       label: "Results",        icon: "fa-chart-column",      href: "student-results.html" },
    { key: "announcements", label: "Announcements",  icon: "fa-bullhorn",          href: "student-announcements.html" },
    { key: "profile",       label: "My Profile",     icon: "fa-user",              href: "profile.html" }
  ];

  const navHtml = navItems.map(item => `
    <a href="${item.href}" class="${config.active === item.key ? "active" : ""}">
      <i class="fa-solid ${item.icon}"></i>
      ${item.label}
    </a>
  `).join("");

  /* ==========================
  Inject Sidebar
  ========================== */

  const sidebarMount = document.getElementById("sidebarMount");

  if (sidebarMount) {
    sidebarMount.outerHTML = `
      <div class="overlay" id="overlay"></div>

      <aside class="sidebar" id="sidebar">
        <div class="logo">
          <h2>VALMS</h2>
          <p>Student Portal</p>
        </div>

        <nav>
          ${navHtml}
          <a href="#" id="logoutBtn">
            <i class="fa-solid fa-right-from-bracket"></i>
            Logout
          </a>
        </nav>
      </aside>
    `;
  }

  /* ==========================
  Inject Topbar
  ========================== */

  const topbarMount = document.getElementById("topbarMount");

  if (topbarMount) {
    topbarMount.outerHTML = `
      <header class="topbar">
        <button class="menu-btn" id="menuBtn">
          <i class="fa-solid fa-bars"></i>
        </button>

        <h2>${config.title || ""}</h2>

        <div class="top-icons">
          <button><i class="fa-solid fa-bell"></i></button>
          <div class="avatar" id="topAvatar">SB</div>
        </div>
      </header>

      ${config.subtitle ? `<p class="page-subtitle">${config.subtitle}</p>` : ""}
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
  }

  /* ==========================
  Logout
  ========================== */

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await client.auth.signOut();
      window.location.href = "login.html";
    });
  }

  /* ==========================
  Load Student Avatar
  ========================== */

  async function loadAvatar() {

    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const { data } = await client
      .from("students")
      .select("first_name, last_name")
      .eq("auth_user_id", user.id)
      .single();

    if (data) {
      const initials = (data.first_name[0] + data.last_name[0]).toUpperCase();
      document.getElementById("topAvatar").textContent = initials;
    }

  }

  loadAvatar();

  // Let the page's own script know the shell is ready,
  // in case it needs elements the shell just injected.
  document.dispatchEvent(new Event("studentShellReady"));

})();