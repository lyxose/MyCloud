const API_BASE = "/api";

const state = {
  token: localStorage.getItem("subjinfo_token"),
  profile: null,
  role: null,
};

const tabs = document.querySelectorAll(".tab");
const tabPanels = {
  register: document.getElementById("tab-register"),
  login: document.getElementById("tab-login"),
};

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const profileForm = document.getElementById("profileForm");
const experimentForm = document.getElementById("experimentForm");
const logoutBtn = document.getElementById("logoutBtn");

const registerStatus = document.getElementById("registerStatus");
const loginStatus = document.getElementById("loginStatus");
const profileStatus = document.getElementById("profileStatus");
const experimentStatus = document.getElementById("experimentStatus");

const profileEmpty = document.getElementById("profileEmpty");
const profileArea = document.getElementById("profileArea");
const profileName = document.getElementById("profileName");
const profileUid = document.getElementById("profileUid");
const profileMeta = document.getElementById("profileMeta");

const adminEmpty = document.getElementById("adminEmpty");
const adminArea = document.getElementById("adminArea");
const loadUsersBtn = document.getElementById("loadUsers");
const userList = document.getElementById("userList");
const adminUserUid = document.getElementById("adminUserUid");
const adminLoadUser = document.getElementById("adminLoadUser");
const adminUserDetail = document.getElementById("adminUserDetail");
const adminUpdateJson = document.getElementById("adminUpdateJson");
const adminUpdateUser = document.getElementById("adminUpdateUser");
const adminPromote = document.getElementById("adminPromote");
const adminStatus = document.getElementById("adminStatus");

const pills = document.querySelectorAll(".pill");

function setStatus(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? "#b42318" : "";
}

function toJsonForm(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

async function apiRequest(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.json) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = data?.error || data || "请求失败";
    throw new Error(message);
  }
  return data;
}

function toggleTab(tabName) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  Object.entries(tabPanels).forEach(([name, panel]) => {
    panel.classList.toggle("active", name === tabName);
  });
}

function renderProfile() {
  if (!state.profile) {
    profileEmpty.classList.remove("hidden");
    profileArea.classList.add("hidden");
    adminEmpty.classList.remove("hidden");
    adminArea.classList.add("hidden");
    return;
  }

  profileEmpty.classList.add("hidden");
  profileArea.classList.remove("hidden");
  profileName.textContent = state.profile.name || "";
  profileUid.textContent = `唯一 ID: ${state.profile.user_uid}`;
  profileMeta.textContent = `年龄: ${state.profile.age ?? "-"} | 单位: ${state.profile.unit ?? "-"}`;

  if (state.role === "admin" || state.role === "root") {
    adminEmpty.classList.add("hidden");
    adminArea.classList.remove("hidden");
  } else {
    adminEmpty.classList.remove("hidden");
    adminArea.classList.add("hidden");
  }
}

async function loadProfile() {
  if (!state.token) return;
  try {
    const data = await apiRequest("/profile", { method: "GET" });
    state.profile = data.profile;
    state.role = data.profile.role;
    renderProfile();
  } catch (error) {
    localStorage.removeItem("subjinfo_token");
    state.token = null;
    state.profile = null;
    state.role = null;
    renderProfile();
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => toggleTab(tab.dataset.tab));
});

pills.forEach((pill) => {
  pill.addEventListener("click", () => {
    const target = document.getElementById(pill.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(registerStatus, "提交中...");
  try {
    const payload = toJsonForm(registerForm);
    payload.consent = payload.consent === "on";
    const data = await apiRequest("/register", { method: "POST", json: payload });
    setStatus(registerStatus, `注册成功，您的唯一 ID 为 ${data.user_uid}`);
    registerForm.reset();
    toggleTab("login");
  } catch (error) {
    setStatus(registerStatus, error.message, true);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(loginStatus, "登录中...");
  try {
    const payload = toJsonForm(loginForm);
    const data = await apiRequest("/login", { method: "POST", json: payload });
    state.token = data.token;
    state.role = data.role;
    localStorage.setItem("subjinfo_token", data.token);
    setStatus(loginStatus, "登录成功");
    await loadProfile();
    loginForm.reset();
  } catch (error) {
    setStatus(loginStatus, error.message, true);
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(profileStatus, "保存中...");
  try {
    const updates = toJsonForm(profileForm);
    await apiRequest("/profile/update", { method: "POST", json: { updates } });
    setStatus(profileStatus, "已保存");
    await loadProfile();
  } catch (error) {
    setStatus(profileStatus, error.message, true);
  }
});

experimentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(experimentStatus, "提交中...");
  try {
    const payload = toJsonForm(experimentForm);
    await apiRequest("/experiments/apply", { method: "POST", json: payload });
    setStatus(experimentStatus, "报名成功");
    experimentForm.reset();
  } catch (error) {
    setStatus(experimentStatus, error.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await apiRequest("/logout", { method: "POST" });
  } catch (error) {
    // ignore
  }
  localStorage.removeItem("subjinfo_token");
  state.token = null;
  state.profile = null;
  state.role = null;
  renderProfile();
});

loadUsersBtn.addEventListener("click", async () => {
  userList.textContent = "加载中...";
  try {
    const data = await apiRequest("/admin/users", { method: "GET" });
    userList.innerHTML = data.users
      .map((user) => `<div class="user-item">${user.user_uid} · ${user.name} · ${user.unit || "-"}</div>`)
      .join("");
  } catch (error) {
    userList.textContent = error.message;
  }
});

adminLoadUser.addEventListener("click", async () => {
  adminUserDetail.textContent = "加载中...";
  try {
    const data = await apiRequest(`/admin/user?user_uid=${encodeURIComponent(adminUserUid.value)}`, {
      method: "GET",
    });
    adminUserDetail.textContent = JSON.stringify(data.profile, null, 2);
  } catch (error) {
    adminUserDetail.textContent = error.message;
  }
});

adminUpdateUser.addEventListener("click", async () => {
  setStatus(adminStatus, "提交中...");
  try {
    const updates = JSON.parse(adminUpdateJson.value || "{}");
    await apiRequest("/admin/update-user", {
      method: "POST",
      json: { user_uid: adminUserUid.value, updates },
    });
    setStatus(adminStatus, "更新完成");
  } catch (error) {
    setStatus(adminStatus, error.message, true);
  }
});

adminPromote.addEventListener("click", async () => {
  setStatus(adminStatus, "提交中...");
  try {
    await apiRequest("/admin/create-admin", {
      method: "POST",
      json: { user_uid: adminUserUid.value },
    });
    setStatus(adminStatus, "已设置为管理员");
  } catch (error) {
    setStatus(adminStatus, error.message, true);
  }
});

loadProfile();
