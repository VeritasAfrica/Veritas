/*
=========================================
Purpose Institute GROUPS (ADMIN)
=========================================
*/

let currentYear = "";

async function loadCurrentYear() {

  const { data } = await client
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", "current_year")
    .maybeSingle();

  currentYear = data?.setting_value || "";
  document.getElementById("newGroupYear").value = currentYear;

}

async function loadGroups() {

  const { data: groups, error } = await client
    .from("student_groups")
    .select("*")
    .order("cohort", { ascending: true })
    .order("group_number", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  // Member count per group, fetched separately since it's a simple count
  // against the students table, not a join student_groups can express directly.
  const { data: students } = await client
    .from("students")
    .select("cohort, group_number")
    .not("group_number", "is", null);

  const counts = {};
  (students || []).forEach(s => {
    const key = `${s.cohort}-${s.group_number}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const table = document.getElementById("groupsTable");
  table.innerHTML = "";

  if (groups.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:40px;">
          No groups yet. Assign groups from the Students page first.
        </td>
      </tr>
    `;
    return;
  }

  groups.forEach(g => {

    const memberCount = counts[`${g.cohort}-${g.group_number}`] || 0;

    table.innerHTML += `
      <tr>
        <td><strong>Group ${g.group_number}</strong> <span style="color:#94A3B8; font-size:12px;">(Cohort ${g.cohort})</span></td>
        <td>${memberCount}</td>
        <td>
          <input type="url" class="link-input" data-group="${g.group_id}"
                 value="${g.whatsapp_link || ""}" placeholder="https://chat.whatsapp.com/..."
                 style="width:100%; padding:10px 14px; border:1px solid #E2E8F0; border-radius:10px; font-family:'Poppins',sans-serif;">
        </td>
        <td>
          <button class="assign-btn save-link-btn" data-group="${g.group_id}">Save</button>
        </td>
      </tr>
    `;

  });

  document.querySelectorAll(".save-link-btn").forEach(btn => {
    btn.addEventListener("click", async () => {

      const groupId = btn.dataset.group;
      const input = document.querySelector(`.link-input[data-group="${groupId}"]`);

      const { error } = await client
        .from("student_groups")
        .update({ whatsapp_link: input.value.trim() })
        .eq("group_id", groupId);

      if (error) {
        alert(error.message);
        return;
      }

      btn.textContent = "Saved";
      setTimeout(() => btn.textContent = "Save", 1500);

    });
  });

}

/* ==========================
Create Group
========================== */
document.getElementById("createGroupForm").addEventListener("submit", async (e) => {

  e.preventDefault();

  const cohort = document.getElementById("newGroupCohort").value.trim();
  const groupNumber = document.getElementById("newGroupNumber").value.trim();
  const link = document.getElementById("newGroupLink").value.trim();

  const { error } = await client
    .from("student_groups")
    .insert({
      cohort,
      year: currentYear,
      group_number: parseInt(groupNumber),
      whatsapp_link: link || null
    });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("createGroupForm").reset();
  document.getElementById("newGroupYear").value = currentYear;
  loadGroups();

});

/* ==========================
General Group Link
========================== */

async function loadGeneralGroup() {

  const { data } = await client
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", "general_group_link")
    .maybeSingle();

  document.getElementById("generalGroupLink").value = data?.setting_value || "";

}

document.getElementById("generalGroupForm").addEventListener("submit", async (e) => {

  e.preventDefault();

  const link = document.getElementById("generalGroupLink").value.trim();

  const { error } = await client
    .from("app_settings")
    .upsert({ setting_key: "general_group_link", setting_value: link || null }, { onConflict: "setting_key" });

  if (error) {
    alert(error.message);
    return;
  }

  alert("General group link saved.");

});

loadGeneralGroup();
loadCurrentYear();
loadGroups();