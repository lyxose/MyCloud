const API_BASE = "/api";

const state = {
  token: localStorage.getItem("subjinfo_token"),
  profile: null,
  role: null,
  experiments: [],
  adminExperiments: [],
};

const adminEditState = {
  experiment: null,
  slots: [],
};

const DEFAULT_UNITS = [
  "北京大学",
  "清华大学",
  "中国科学院心理研究所",
  "中国科学院生物物理研究所",
  "中国科学院青藏高原研究所",
  "中国科学院微生物研究所",
  "北京林业大学",
  "中国农业大学",
  "北京体育大学",
  "北京语言大学",
  "中国人民大学",
  "北京科技大学",
  "中国地质大学（北京）",
  "中国矿业大学（北京）",
  "北京交通大学",
  "北京航空航天大学",
  "北京邮电大学",
  "中央民族大学",
  "北京外国语大学",
  "北京化工大学",
  "中国政法大学",
  "华北电力大学",
  "对外经济贸易大学",
  "中央财经大学",
  "北京师范大学",
  "中国传媒大学",
];

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

const profileCard = document.getElementById("profile");
const consentSection = document.getElementById("consent");
const profilePane = document.getElementById("profilePane");
const profileToggle = document.getElementById("profileToggle");

const unitInput = document.getElementById("unitInput");
const unitSuggestions = document.getElementById("unitSuggestions");

const changePasswordBtn = document.getElementById("changePasswordBtn");
const passwordPanel = document.getElementById("passwordPanel");
const passwordPanelClose = document.getElementById("passwordPanelClose");
const passwordForm = document.getElementById("passwordForm");
const passwordStatus = document.getElementById("passwordStatus");
const rootPasswordSection = document.getElementById("rootPasswordSection");

const adminArea = document.getElementById("adminArea");
const adminTabs = document.getElementById("adminTabs");
const adminPanelNew = document.getElementById("adminPanelNew");
const adminExperimentForm = document.getElementById("adminExperimentForm");
const adminExperimentStatus = document.getElementById("adminExperimentStatus");
const adminContactPhone = document.getElementById("adminContactPhone");
const adminConditions = document.getElementById("adminConditions");
const adminQuota = document.getElementById("adminQuota");
const quotaHelpBtn = document.getElementById("quotaHelpBtn");
const quotaHelpBubble = document.getElementById("quotaHelpBubble");
const scheduleEditor = document.getElementById("scheduleEditor");
const scheduleGrid = document.getElementById("scheduleGrid");
const schedulePrev = document.getElementById("schedulePrev");
const scheduleNext = document.getElementById("scheduleNext");
const scheduleFill = document.getElementById("scheduleFill");
const scheduleRefresh = document.getElementById("scheduleRefresh");
const scheduleTitle = document.getElementById("scheduleTitle");
const scheduleRequired = document.getElementById("scheduleRequired");
const locationSelect = document.getElementById("locationSelect");
const locationLinkField = document.getElementById("locationLinkField");
const locationCustomField = document.getElementById("locationCustomField");

const adminExperimentsSection = document.getElementById("adminExperiments");
const adminExperimentList = document.getElementById("adminExperimentList");
const adminExperimentsRefresh = document.getElementById("adminExperimentsRefresh");

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

function setProfilePaneCollapsed(collapsed) {
  if (!profilePane) return;
  profilePane.classList.toggle("collapsed", collapsed);
  profileToggle.textContent = collapsed ? "展开" : "收起";
}

function applyRoleLayout() {
  const isAdmin = state.role === "admin" || state.role === "root";
  profilePane?.classList.toggle("hidden", isAdmin);
  experimentForm?.classList.toggle("hidden", isAdmin);
  adminArea?.classList.toggle("hidden", !isAdmin);
  adminExperimentsSection?.classList.toggle("hidden", !isAdmin);
  consentSection?.classList.toggle("hidden", isAdmin);
  rootPasswordSection?.classList.toggle("hidden", state.role !== "root");
}

function populateProfileForm(profile) {
  if (!profile) return;
  const mapping = {
    wechat: profile.wechat,
    region: profile.region,
    handedness: profile.handedness,
    left_myopia: profile.left_myopia,
    right_myopia: profile.right_myopia,
    ethnicity: profile.ethnicity,
    education_years: profile.education_years,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    head_circumference_cm: profile.head_circumference_cm,
    metal_implant: profile.metal_implant,
    claustrophobia: profile.claustrophobia,
  };

  Object.entries(mapping).forEach(([key, value]) => {
    const field = profileForm?.elements?.namedItem?.(key);
    if (!field) return;
    field.value = value ?? "";
  });
}

function renderProfile() {
  if (!state.profile) {
    profileCard.classList.add("hidden");
    profileEmpty.classList.remove("hidden");
    profileArea.classList.add("hidden");
    adminArea?.classList.add("hidden");
    adminExperimentsSection?.classList.add("hidden");
    consentSection?.classList.remove("hidden");
    return;
  }

  profileCard.classList.remove("hidden");
  profileEmpty.classList.add("hidden");
  profileArea.classList.remove("hidden");
  profileName.textContent = state.profile.name || "";
  profileUid.textContent = `系统内ID: ${state.profile.user_uid}`;
  profileMeta.textContent = `年龄: ${state.profile.age ?? "-"} | 单位: ${state.profile.unit ?? "-"}`;
  populateProfileForm(state.profile);
  applyRoleLayout();
  if (adminContactPhone && state.profile.alipay_phone) {
    adminContactPhone.value = state.profile.alipay_phone;
  }
}

const scheduleState = {
  weekStart: startOfWeek(new Date()),
  slots: [],
  selectedIds: new Set(),
  activeDayIndex: 0,
};

const PX_PER_MIN = 2;
let capacityBuffer = "";
let capacityTimer = null;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateLabel(date) {
  const week = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}/${date.getDate()} 周${week[date.getDay()]}`;
}

function buildWeekDates(startDate) {
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function renderScheduleGrid() {
  if (!scheduleGrid) return;
  scheduleGrid.innerHTML = "";
  const days = buildWeekDates(scheduleState.weekStart);
  scheduleTitle.textContent = `${days[0].getMonth() + 1}/${days[0].getDate()} - ${days[6].getMonth() + 1}/${days[6].getDate()}`;

  days.forEach((date, index) => {
    const dayEl = document.createElement("div");
    dayEl.className = "schedule-day";
    const header = document.createElement("div");
    header.className = "schedule-day-header";
    header.textContent = formatDateLabel(date);
    if (index === scheduleState.activeDayIndex) header.classList.add("active");
    header.addEventListener("click", () => {
      scheduleState.activeDayIndex = index;
      renderScheduleGrid();
    });

    const body = document.createElement("div");
    body.className = "schedule-day-body";
    body.scrollTop = 8 * 60 * PX_PER_MIN;
    const timeline = document.createElement("div");
    timeline.className = "schedule-timeline";
    timeline.dataset.date = date.toISOString().slice(0, 10);

    for (let hour = 0; hour <= 24; hour += 1) {
      const hourLine = document.createElement("div");
      hourLine.className = "schedule-hour";
      hourLine.style.top = `${hour * 60 * PX_PER_MIN}px`;
      hourLine.textContent = `${String(hour).padStart(2, "0")}:00`;
      timeline.appendChild(hourLine);
    }

    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      const minutes = now.getHours() * 60 + now.getMinutes();
      const nowLine = document.createElement("div");
      nowLine.className = "schedule-now";
      nowLine.style.top = `${minutes * PX_PER_MIN}px`;
      timeline.appendChild(nowLine);

      const past = document.createElement("div");
      past.className = "schedule-past";
      past.style.top = "0px";
      past.style.height = `${minutes * PX_PER_MIN}px`;
      timeline.appendChild(past);
    }

    timeline.addEventListener("click", (event) => {
      if (event.target.classList.contains("schedule-slot")) return;
      const rect = timeline.getBoundingClientRect();
      const offsetY = event.clientY - rect.top + timeline.scrollTop;
      const startMin = Math.max(0, Math.round(offsetY / PX_PER_MIN / 10) * 10);
      const durationMin = Number(adminExperimentForm?.elements?.namedItem?.("duration_min")?.value || 0);
      if (!durationMin) {
        setStatus(adminExperimentStatus, "请先填写预计时长", true);
        return;
      }
      const endMin = Math.min(1440, startMin + durationMin);

      const isToday = date.toDateString() === new Date().toDateString();
      if (isToday && startMin < (new Date().getHours() * 60 + new Date().getMinutes())) {
        setStatus(adminExperimentStatus, "不能选择当前时间之前的时段", true);
        return;
      }

      addScheduleSlot({ date, startMin, endMin, capacity: 1 });
      renderScheduleGrid();
    });

    scheduleState.slots
      .filter((slot) => slot.date === date.toISOString().slice(0, 10))
      .forEach((slot) => {
        const slotEl = document.createElement("div");
        slotEl.className = "schedule-slot";
        if (scheduleState.selectedIds.has(slot.id)) {
          slotEl.classList.add("selected");
        }
        slotEl.style.top = `${slot.startMin * PX_PER_MIN}px`;
        slotEl.style.height = `${(slot.endMin - slot.startMin) * PX_PER_MIN}px`;
        slotEl.dataset.id = slot.id;
        slotEl.innerHTML = `
          <div class="slot-time">
            <span>${formatMinutes(slot.startMin)}</span>
            <span>${formatMinutes(slot.endMin)}</span>
          </div>
          <div class="slot-count">${slot.capacity}人</div>
        `;

        slotEl.addEventListener("click", (event) => {
          event.stopPropagation();
          if (event.ctrlKey || event.metaKey) {
            toggleSlotSelection(slot.id);
          } else {
            scheduleState.selectedIds = new Set([slot.id]);
          }
          renderScheduleGrid();
        });

        enableSlotDrag(slotEl, slot);
        timeline.appendChild(slotEl);
      });

    body.appendChild(timeline);
    dayEl.appendChild(header);
    dayEl.appendChild(body);
    scheduleGrid.appendChild(dayEl);
  });
}

function addScheduleSlot({ date, startMin, endMin, capacity }) {
  scheduleState.slots.push({
    id: `slot_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    date: date.toISOString().slice(0, 10),
    startMin,
    endMin,
    capacity: capacity || 1,
  });
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toggleSlotSelection(id) {
  if (scheduleState.selectedIds.has(id)) {
    scheduleState.selectedIds.delete(id);
  } else {
    scheduleState.selectedIds.add(id);
  }
}

function enableSlotDrag(slotEl, slot) {
  let startY = 0;
  let startMin = slot.startMin;
  let endMin = slot.endMin;
  let dragging = false;

  const onMove = (event) => {
    if (!dragging) return;
    const delta = event.clientY - startY;
    const step = Math.round(delta / (PX_PER_MIN * 10)) * 10;
    const duration = endMin - startMin;
    let nextStart = Math.max(0, Math.min(1440 - duration, startMin + step));
    if (slot.date === new Date().toISOString().slice(0, 10)) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      if (nextStart < nowMin) nextStart = nowMin;
    }
    let nextEnd = nextStart + duration;
    slot.startMin = nextStart;
    slot.endMin = nextEnd;
    renderScheduleGrid();
  };

  const onUp = () => {
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };

  slotEl.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    startY = event.clientY;
    startMin = slot.startMin;
    endMin = slot.endMin;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

function shiftSelectedSlots(minuteDelta) {
  const selected = scheduleState.slots.filter((slot) => scheduleState.selectedIds.has(slot.id));
  selected.forEach((slot) => {
    const duration = slot.endMin - slot.startMin;
    let nextStart = Math.max(0, Math.min(1440 - duration, slot.startMin + minuteDelta));
    slot.startMin = nextStart;
    slot.endMin = nextStart + duration;
  });
  renderScheduleGrid();
}

function deleteSelectedSlots() {
  if (scheduleState.selectedIds.size === 0) return;
  scheduleState.slots = scheduleState.slots.filter((slot) => !scheduleState.selectedIds.has(slot.id));
  scheduleState.selectedIds.clear();
  renderScheduleGrid();
}

function setSelectedSlotCapacity(value) {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return;
  scheduleState.slots.forEach((slot) => {
    if (scheduleState.selectedIds.has(slot.id)) {
      slot.capacity = num;
    }
  });
  renderScheduleGrid();
}

function shiftAdminSelectedSlots(minuteDelta) {
  const selected = adminScheduleState.slots.filter((slot) => adminScheduleState.selectedIds.has(slot.id));
  selected.forEach((slot) => {
    const duration = slot.endMin - slot.startMin;
    let nextStart = Math.max(0, Math.min(1440 - duration, slot.startMin + minuteDelta));
    slot.startMin = nextStart;
    slot.endMin = nextStart + duration;
  });
  renderAdminEditScheduleGrid();
}

function deleteAdminSelectedSlots() {
  if (adminScheduleState.selectedIds.size === 0) return;
  adminScheduleState.slots = adminScheduleState.slots.filter((slot) => !adminScheduleState.selectedIds.has(slot.id));
  adminScheduleState.selectedIds.clear();
  renderAdminEditScheduleGrid();
}

function setAdminSelectedSlotCapacity(value) {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return;
  adminScheduleState.slots.forEach((slot) => {
    if (adminScheduleState.selectedIds.has(slot.id)) {
      slot.capacity = num;
    }
  });
  renderAdminEditScheduleGrid();
}

function buildSchedulePayload() {
  return scheduleState.slots.map((slot) => {
    const start = new Date(`${slot.date}T${formatMinutes(slot.startMin)}:00`);
    const end = new Date(`${slot.date}T${formatMinutes(slot.endMin)}:00`);
    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      capacity: slot.capacity,
    };
  });
}

const adminScheduleState = {
  weekStart: startOfWeek(new Date()),
  slots: [],
  selectedIds: new Set(),
  activeDayIndex: 0,
};

function renderAdminEditScheduleGrid() {
  const container = document.getElementById("adminEditScheduleGrid");
  if (!container) return;
  container.innerHTML = "";
  const days = buildWeekDates(adminScheduleState.weekStart);

  days.forEach((date, index) => {
    const dayEl = document.createElement("div");
    dayEl.className = "schedule-day";
    const header = document.createElement("div");
    header.className = "schedule-day-header";
    header.textContent = formatDateLabel(date);
    if (index === adminScheduleState.activeDayIndex) header.classList.add("active");
    header.addEventListener("click", () => {
      adminScheduleState.activeDayIndex = index;
      renderAdminEditScheduleGrid();
    });

    const body = document.createElement("div");
    body.className = "schedule-day-body";
    body.scrollTop = 8 * 60 * PX_PER_MIN;
    const timeline = document.createElement("div");
    timeline.className = "schedule-timeline";
    timeline.dataset.date = date.toISOString().slice(0, 10);

    for (let hour = 0; hour <= 24; hour += 1) {
      const hourLine = document.createElement("div");
      hourLine.className = "schedule-hour";
      hourLine.style.top = `${hour * 60 * PX_PER_MIN}px`;
      hourLine.textContent = `${String(hour).padStart(2, "0")}:00`;
      timeline.appendChild(hourLine);
    }

    timeline.addEventListener("click", (event) => {
      if (event.target.classList.contains("schedule-slot")) return;
      const rect = timeline.getBoundingClientRect();
      const offsetY = event.clientY - rect.top + timeline.scrollTop;
      const startMin = Math.max(0, Math.round(offsetY / PX_PER_MIN / 10) * 10);
      const durationMin = Number(adminEditState.experiment?.duration_min || 0);
      if (!durationMin) return;
      const endMin = Math.min(1440, startMin + durationMin);
      addAdminScheduleSlot({ date, startMin, endMin, capacity: 1 });
      renderAdminEditScheduleGrid();
    });

    adminScheduleState.slots
      .filter((slot) => slot.date === date.toISOString().slice(0, 10))
      .forEach((slot) => {
        const slotEl = document.createElement("div");
        slotEl.className = "schedule-slot";
        if (adminScheduleState.selectedIds.has(slot.id)) {
          slotEl.classList.add("selected");
        }
        slotEl.style.top = `${slot.startMin * PX_PER_MIN}px`;
        slotEl.style.height = `${(slot.endMin - slot.startMin) * PX_PER_MIN}px`;
        slotEl.dataset.id = slot.id;
        slotEl.innerHTML = `
          <div class="slot-time">
            <span>${formatMinutes(slot.startMin)}</span>
            <span>${formatMinutes(slot.endMin)}</span>
          </div>
          <div class="slot-count">${slot.capacity}人</div>
        `;

        slotEl.addEventListener("click", (event) => {
          event.stopPropagation();
          if (event.ctrlKey || event.metaKey) {
            toggleAdminSlotSelection(slot.id);
          } else {
            adminScheduleState.selectedIds = new Set([slot.id]);
          }
          renderAdminEditScheduleGrid();
        });

        enableAdminSlotDrag(slotEl, slot);
        timeline.appendChild(slotEl);
      });

    body.appendChild(timeline);
    dayEl.appendChild(header);
    dayEl.appendChild(body);
    container.appendChild(dayEl);
  });
}

function addAdminScheduleSlot({ date, startMin, endMin, capacity }) {
  adminScheduleState.slots.push({
    id: `slot_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    date: date.toISOString().slice(0, 10),
    startMin,
    endMin,
    capacity: capacity || 1,
  });
}

function toggleAdminSlotSelection(id) {
  if (adminScheduleState.selectedIds.has(id)) {
    adminScheduleState.selectedIds.delete(id);
  } else {
    adminScheduleState.selectedIds.add(id);
  }
}

function enableAdminSlotDrag(slotEl, slot) {
  let startY = 0;
  let startMin = slot.startMin;
  let endMin = slot.endMin;
  let dragging = false;

  const onMove = (event) => {
    if (!dragging) return;
    const delta = event.clientY - startY;
    const step = Math.round(delta / (PX_PER_MIN * 10)) * 10;
    const duration = endMin - startMin;
    let nextStart = Math.max(0, Math.min(1440 - duration, startMin + step));
    slot.startMin = nextStart;
    slot.endMin = nextStart + duration;
    renderAdminEditScheduleGrid();
  };

  const onUp = () => {
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };

  slotEl.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    startY = event.clientY;
    startMin = slot.startMin;
    endMin = slot.endMin;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

function buildAdminSchedulePayload() {
  return adminScheduleState.slots.map((slot) => {
    const start = new Date(`${slot.date}T${formatMinutes(slot.startMin)}:00`);
    const end = new Date(`${slot.date}T${formatMinutes(slot.endMin)}:00`);
    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      capacity: slot.capacity,
    };
  });
}

function convertSlotToSchedule(slot) {
  if (!slot.start_time || !slot.end_time) return null;
  const start = new Date(slot.start_time);
  const end = new Date(slot.end_time);
  return {
    id: `existing_${slot.id}`,
    date: slot.start_time.slice(0, 10),
    startMin: start.getHours() * 60 + start.getMinutes(),
    endMin: end.getHours() * 60 + end.getMinutes(),
    capacity: slot.capacity || 1,
  };
}

async function loadProfile() {
  if (!state.token) return;
  try {
    const data = await apiRequest("/profile", { method: "GET" });
    state.profile = data.profile;
    state.role = data.profile.role;
    renderProfile();
    await loadExperiments();
    if (state.role === "admin" || state.role === "root") {
      await loadAdminExperiments();
      await loadAdminExperimentList();
    }
  } catch (error) {
    localStorage.removeItem("subjinfo_token");
    state.token = null;
    state.profile = null;
    state.role = null;
    renderProfile();
  }
}

async function loadUnits() {
  try {
    const data = await apiRequest("/units", { method: "GET" });
    const merged = new Set([...DEFAULT_UNITS, ...(data.units || [])]);
    state.units = Array.from(merged).sort();
    renderUnitSuggestions();
  } catch {
    state.units = [...DEFAULT_UNITS];
  }
}

function renderUnitSuggestions(query = "") {
  if (!unitSuggestions) return;
  const keyword = String(query || "").trim();
  const list = keyword
    ? (state.units || DEFAULT_UNITS).filter((item) => item.includes(keyword))
    : [];
  unitSuggestions.innerHTML = "";
  if (list.length === 0) {
    unitSuggestions.classList.remove("active");
    return;
  }

  list.slice(0, 8).forEach((item) => {
    const el = document.createElement("div");
    el.className = "autocomplete-item";
    el.textContent = item;
    el.addEventListener("click", () => {
      unitInput.value = item;
      unitSuggestions.classList.remove("active");
    });
    unitSuggestions.appendChild(el);
  });
  unitSuggestions.classList.add("active");
}

async function loadExperiments() {
  if (!state.token) return;
  try {
    const data = await apiRequest("/experiments", { method: "GET" });
    state.experiments = data.experiments || [];
    renderExperiments();
  } catch (error) {
    state.experiments = [];
  }
}

function renderExperiments() {
  const container = experimentForm?.querySelector(".experiment-list");
  if (!container) return;
  container.innerHTML = "";
  if (!state.experiments.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "暂无开放实验。";
    container.appendChild(empty);
    return;
  }

  state.experiments.forEach((exp) => {
    const card = document.createElement("div");
    card.className = "experiment-card";
    const eligibility = exp.eligibility?.ok ? "可报名" : exp.eligibility?.reason || "暂不可报名";
    card.innerHTML = `
      <div class="experiment-card-header">
        <strong>${exp.name}</strong>
        <span>${exp.type}</span>
      </div>
      <div class="experiment-card-body">
        <p>${exp.description || "暂无简介"}</p>
        <p class="hint">${eligibility}</p>
      </div>
      <div class="experiment-card-actions">
        <button type="button" class="ghost" data-action="detail">查看详情</button>
        <button type="button" class="primary" data-action="apply">报名</button>
      </div>
    `;

    const applyBtn = card.querySelector("[data-action='apply']");
    const detailBtn = card.querySelector("[data-action='detail']");
    applyBtn.disabled = !exp.eligibility?.ok;

    detailBtn.addEventListener("click", () => showExperimentDetail(exp));
    applyBtn.addEventListener("click", () => applyExperiment(exp));

    container.appendChild(card);
  });
}

async function loadAdminExperiments() {
  if (!(state.role === "admin" || state.role === "root")) return;
  try {
    const data = await apiRequest("/admin/experiments", { method: "GET" });
    state.adminExperiments = data.experiments || [];
    renderAdminTabs();
  } catch {
    state.adminExperiments = [];
  }
}

function renderAdminTabs() {
  if (!adminTabs) return;
  adminTabs.innerHTML = "";
  const newTab = document.createElement("button");
  newTab.className = "tab active";
  newTab.dataset.adminTab = "new";
  newTab.textContent = "新实验";
  newTab.addEventListener("click", () => selectAdminTab("new"));
  adminTabs.appendChild(newTab);

  state.adminExperiments.forEach((exp) => {
    const tab = document.createElement("button");
    tab.className = "tab";
    tab.dataset.adminTab = exp.experiment_uid;
    tab.textContent = exp.name;
    tab.addEventListener("click", () => selectAdminTab(exp.experiment_uid));
    adminTabs.appendChild(tab);
  });
}

async function selectAdminTab(tabKey) {
  const tabs = adminTabs.querySelectorAll(".tab");
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.adminTab === tabKey));
  const panel = document.getElementById("adminPanelExperiments");
  if (tabKey === "new") {
    adminPanelNew.classList.add("active");
    panel?.classList.remove("active");
    adminEditState.experiment = null;
    return;
  }
  adminPanelNew.classList.remove("active");
  panel?.classList.add("active");
  await loadAdminExperimentDetail(tabKey);
}

async function loadAdminExperimentDetail(experimentUid) {
  try {
    const data = await apiRequest(`/admin/experiment?experiment_uid=${encodeURIComponent(experimentUid)}`, {
      method: "GET",
    });
    renderAdminExperimentDetail(data.experiment, data.slots || [], data.participants || {});
  } catch (error) {
    setStatus(adminExperimentStatus, error.message, true);
  }
}

function renderAdminExperimentDetail(experiment, slots, participants) {
  const panel = document.getElementById("adminPanelExperiments");
  if (!panel) return;
  panel.classList.add("active");
  adminEditState.experiment = experiment;
  adminEditState.slots = slots;
  panel.innerHTML = `
    <div class="admin-layout">
      <div class="admin-left">
        <h4>${experiment.name}</h4>
        <p class="hint">${experiment.type} · ${experiment.location}</p>
        <button class="ghost" id="pauseExperimentBtn">${experiment.status === "paused" ? "继续招募" : "暂停收集"}</button>
        <label>
          入组条件
          <textarea id="adminEditConditions" rows="4">${experiment.conditions_text || ""}</textarea>
        </label>
        <label>
          名额分配
          <textarea id="adminEditQuota" rows="4">${experiment.quotas_text || ""}</textarea>
        </label>
        <button class="primary" id="saveExperimentRules">保存条件设置</button>
      </div>
      <div class="admin-right">
        <div class="schedule-editor">
          <div class="schedule-header">
            <span>排期预览</span>
          </div>
          <div class="schedule-grid" id="adminSchedulePreview"></div>
        </div>
        <div class="schedule-editor" id="adminScheduleEditor">
          <div class="schedule-header">
            <span>编辑排期</span>
            <button class="ghost" id="adminEditScheduleLoad">加载排期</button>
            <button class="ghost" id="adminEditScheduleSave">保存排期</button>
          </div>
          <div class="schedule-grid" id="adminEditScheduleGrid"></div>
        </div>
      </div>
    </div>
  `;

  const pauseBtn = panel.querySelector("#pauseExperimentBtn");
  const saveRulesBtn = panel.querySelector("#saveExperimentRules");
  const editConditions = panel.querySelector("#adminEditConditions");
  const editQuota = panel.querySelector("#adminEditQuota");
  const editScheduleLoad = panel.querySelector("#adminEditScheduleLoad");
  const editScheduleSave = panel.querySelector("#adminEditScheduleSave");
  pauseBtn.addEventListener("click", async () => {
    try {
      await apiRequest("/admin/experiment/pause", {
        method: "POST",
        json: { experiment_uid: experiment.experiment_uid, paused: experiment.status !== "paused" },
      });
      await loadAdminExperiments();
      await loadAdminExperimentList();
    } catch (error) {
      setStatus(adminExperimentStatus, error.message, true);
    }
  });

  saveRulesBtn.addEventListener("click", async () => {
    try {
      await apiRequest("/admin/experiment/update", {
        method: "POST",
        json: {
          experiment_uid: experiment.experiment_uid,
          conditions_text: editConditions.value,
          quotas_text: editQuota.value,
        },
      });
      setStatus(adminExperimentStatus, "条件设置已保存");
    } catch (error) {
      setStatus(adminExperimentStatus, error.message, true);
      if (error.message.includes("无法解析")) {
        alert("入组条件或名额分配格式不正确。示例：\n年龄>=18 & 年龄<30 & (左眼近视度数<600|右眼近视度数<600)\nALL*20");
      }
    }
  });

  editScheduleLoad.addEventListener("click", () => {
    const editableSlots = slots
      .filter((slot) => slot.locked === 0)
      .map(convertSlotToSchedule)
      .filter(Boolean);
    adminScheduleState.slots = editableSlots;
    adminScheduleState.selectedIds.clear();
    if (editableSlots.length > 0) {
      adminScheduleState.weekStart = startOfWeek(new Date(`${editableSlots[0].date}T00:00:00`));
    }
    renderAdminEditScheduleGrid();
  });

  editScheduleSave.addEventListener("click", async () => {
    try {
      await apiRequest("/admin/experiment/update", {
        method: "POST",
        json: {
          experiment_uid: experiment.experiment_uid,
          schedule_slots: buildAdminSchedulePayload(),
        },
      });
      setStatus(adminExperimentStatus, "排期已保存");
      await loadAdminExperimentDetail(experiment.experiment_uid);
    } catch (error) {
      setStatus(adminExperimentStatus, error.message, true);
    }
  });

  renderAdminSchedulePreview(slots, participants, panel.querySelector("#adminSchedulePreview"));
  renderAdminEditScheduleGrid();
}

function renderAdminSchedulePreview(slots, participantsMap, container) {
  if (!container) return;
  container.innerHTML = "";
  if (!slots.length) {
    container.textContent = "暂无排期";
    return;
  }
  const grouped = {};
  slots.forEach((slot) => {
    if (!slot.start_time) return;
    const dateKey = slot.start_time.slice(0, 10);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(slot);
  });
  Object.entries(grouped).forEach(([dateKey, daySlots]) => {
    const day = document.createElement("div");
    day.className = "schedule-day";
    day.innerHTML = `<div class="schedule-day-header">${dateKey}</div>`;
    const body = document.createElement("div");
    body.className = "schedule-day-body";
    daySlots.forEach((slot) => {
      const block = document.createElement("div");
      block.className = "schedule-slot";
      const slotParticipants = JSON.parse(slot.participants_json || "[]");
      const names = slotParticipants.map((p) => p.name).join("、");
      block.innerHTML = `
        <div class="slot-time">
          <span>${formatSlotTime(slot.start_time)}</span>
          <span>${formatSlotTime(slot.end_time)}</span>
        </div>
        <div class="slot-count">${names || "空"}</div>
      `;
      block.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!slotParticipants.length) return;
        const contact = slotParticipants
          .map((p) => {
            const info = participantsMap[p.user_uid] || {};
            return `${p.name} ${info.alipay_phone || "-"} ${info.wechat || "-"}`;
          })
          .join("\n");
        showTooltip(contact, event.pageX + 8, event.pageY + 8);
      });
      body.appendChild(block);
    });
    day.appendChild(body);
    container.appendChild(day);
  });
}

async function loadAdminExperimentList() {
  if (!(state.role === "admin" || state.role === "root")) return;
  try {
    const data = await apiRequest("/admin/experiments", { method: "GET" });
    renderAdminExperimentList(data.experiments || []);
  } catch (error) {
    adminExperimentList.textContent = error.message;
  }
}

function renderAdminExperimentList(experiments) {
  if (!adminExperimentList) return;
  adminExperimentList.innerHTML = "";
  experiments.forEach((exp) => {
    const card = document.createElement("div");
    card.className = "admin-experiment-card";
    card.innerHTML = `
      <h4>${exp.name}</h4>
      <p class="hint">${exp.type} · ${exp.location}</p>
      <button type="button" class="ghost" data-action="toggle">展开参与名单</button>
      <div class="admin-participant-list hidden"></div>
    `;
    const toggleBtn = card.querySelector("[data-action='toggle']");
    const list = card.querySelector(".admin-participant-list");
    toggleBtn.addEventListener("click", async () => {
      list.classList.toggle("hidden");
      if (!list.classList.contains("hidden")) {
        await loadParticipantsForExperiment(exp.experiment_uid, list);
      }
    });
    adminExperimentList.appendChild(card);
  });
}

function showTooltip(text, x, y) {
  const existing = document.querySelector(".tooltip");
  if (existing) existing.remove();
  const tip = document.createElement("div");
  tip.className = "tooltip";
  tip.textContent = text;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
  document.body.appendChild(tip);
  setTimeout(() => {
    tip.remove();
  }, 4000);
}

async function loadParticipantsForExperiment(experimentUid, list) {
  list.innerHTML = "加载中...";
  try {
    const data = await apiRequest(`/admin/experiment?experiment_uid=${encodeURIComponent(experimentUid)}`, {
      method: "GET",
    });
    const participants = [];
    (data.slots || []).forEach((slot) => {
      const slotParticipants = JSON.parse(slot.participants_json || "[]");
      slotParticipants.forEach((p) => participants.push({ ...p, slot }));
    });
    if (!participants.length) {
      list.textContent = "暂无报名";
      return;
    }
    list.innerHTML = "";
    participants.forEach((participant) => {
      const item = document.createElement("div");
      item.className = "admin-participant-item";
      item.innerHTML = `
        <span>${participant.name} (${participant.user_uid})</span>
        <button type="button" class="ghost" data-action="feedback">添加评价</button>
      `;
      item.querySelector("[data-action='feedback']").addEventListener("click", async () => {
        const feedback = prompt("输入评价信息");
        if (!feedback) return;
        await apiRequest("/admin/experiment/feedback", {
          method: "POST",
          json: { user_uid: participant.user_uid, experiment_uid: experimentUid, feedback },
        });
      });
      list.appendChild(item);
    });
  } catch (error) {
    list.textContent = error.message;
  }
}

async function showExperimentDetail(exp) {
  if (!exp.schedule_required) {
    setStatus(experimentStatus, exp.location === "在线" ? "此实验无需预约时间" : "请直接报名后联系主试", false);
    return;
  }
  try {
    const data = await apiRequest(`/experiments/detail?experiment_uid=${encodeURIComponent(exp.experiment_uid)}`, {
      method: "GET",
    });
    renderExperimentSlots(exp, data.slots || []);
  } catch (error) {
    setStatus(experimentStatus, error.message, true);
  }
}

function renderExperimentSlots(exp, slots) {
  const container = experimentForm?.querySelector(".experiment-list");
  if (!container) return;
  const existing = container.querySelector(".experiment-slots");
  if (existing) existing.remove();
  const slotWrap = document.createElement("div");
  slotWrap.className = "experiment-slots";
  slotWrap.innerHTML = `<p class="hint">请选择可预约时间段</p>`;
  slots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ghost";
    btn.textContent = `${formatSlotTime(slot.start_time)} - ${formatSlotTime(slot.end_time)} (${slot.remaining}人)`;
    btn.addEventListener("click", () => applyExperiment(exp, slot));
    slotWrap.appendChild(btn);
  });
  container.appendChild(slotWrap);
}

function formatSlotTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function applyExperiment(exp, slot) {
  setStatus(experimentStatus, "提交中...");
  try {
    const payload = {
      experiment_uid: exp.experiment_uid,
      slot_id: slot?.id,
    };
    const data = await apiRequest("/experiments/apply", { method: "POST", json: payload });
    if (data.location === "在线" && data.location_link) {
      setStatus(experimentStatus, "报名成功，正在跳转实验链接...");
      window.open(data.location_link, "_blank");
    } else {
      const contact = data.contact_phone ? `主试联系方式：${data.contact_phone}` : "请联系主试确认信息";
      setStatus(experimentStatus, `报名成功，${contact}`);
    }
    await loadExperiments();
  } catch (error) {
    setStatus(experimentStatus, error.message, true);
    if (error.message.includes("补全")) {
      setProfilePaneCollapsed(false);
      profilePane?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => toggleTab(tab.dataset.tab));
});

profileToggle?.addEventListener("click", () => {
  const collapsed = profilePane.classList.contains("collapsed");
  setProfilePaneCollapsed(!collapsed);
});

changePasswordBtn?.addEventListener("click", () => {
  passwordPanel.classList.toggle("hidden");
});

passwordPanelClose?.addEventListener("click", () => {
  passwordPanel.classList.add("hidden");
});

unitInput?.addEventListener("input", (event) => {
  renderUnitSuggestions(event.target.value);
});

unitInput?.addEventListener("focus", (event) => {
  renderUnitSuggestions(event.target.value);
});

document.addEventListener("click", (event) => {
  if (!unitSuggestions || !unitInput) return;
  if (!unitSuggestions.contains(event.target) && event.target !== unitInput) {
    unitSuggestions.classList.remove("active");
  }
});

adminExperimentsRefresh?.addEventListener("click", async () => {
  await loadAdminExperimentList();
});

quotaHelpBtn?.addEventListener("click", () => {
  quotaHelpBubble.classList.toggle("active");
  quotaHelpBubble.style.display = quotaHelpBubble.classList.contains("active") ? "block" : "none";
});

quotaHelpBtn?.addEventListener("mouseenter", () => {
  quotaHelpBubble.style.display = "block";
});

quotaHelpBtn?.addEventListener("mouseleave", () => {
  if (!quotaHelpBubble.classList.contains("active")) {
    quotaHelpBubble.style.display = "none";
  }
});

locationSelect?.addEventListener("change", () => {
  const isOnline = locationSelect.value === "在线";
  locationLinkField?.classList.toggle("hidden", !isOnline);
  const isCustom = locationSelect.value === "其他";
  locationCustomField?.classList.toggle("hidden", !isCustom);
});

scheduleRequired?.addEventListener("change", () => {
  scheduleEditor?.classList.toggle("hidden", scheduleRequired.value !== "yes");
});

schedulePrev?.addEventListener("click", () => {
  const todayStart = startOfWeek(new Date());
  const next = new Date(scheduleState.weekStart);
  next.setDate(next.getDate() - 7);
  if (next < todayStart) return;
  scheduleState.weekStart = next;
  renderScheduleGrid();
});

scheduleNext?.addEventListener("click", () => {
  const next = new Date(scheduleState.weekStart);
  next.setDate(next.getDate() + 7);
  scheduleState.weekStart = next;
  renderScheduleGrid();
});

scheduleFill?.addEventListener("click", () => {
  const durationMin = Number(adminExperimentForm?.elements?.namedItem?.("duration_min")?.value || 0);
  if (!durationMin) {
    setStatus(adminExperimentStatus, "请先填写预计时长", true);
    return;
  }
  const days = buildWeekDates(scheduleState.weekStart);
  const date = days[scheduleState.activeDayIndex];
  const dayKey = date.toISOString().slice(0, 10);
  scheduleState.slots = scheduleState.slots.filter((slot) => slot.date !== dayKey);
  let cursor = 9 * 60;
  while (cursor + durationMin <= 22 * 60) {
    addScheduleSlot({ date, startMin: cursor, endMin: cursor + durationMin, capacity: 1 });
    cursor += durationMin + 20;
  }
  renderScheduleGrid();
});

scheduleRefresh?.addEventListener("click", () => {
  renderScheduleGrid();
});

document.addEventListener("keydown", (event) => {
  if (adminArea?.classList.contains("hidden")) return;
  const hasAdminSelection = adminScheduleState.selectedIds.size > 0;
  const hasNewSelection = scheduleState.selectedIds.size > 0;
  if (event.key === "Delete") {
    if (hasAdminSelection) {
      deleteAdminSelectedSlots();
    } else {
      deleteSelectedSlots();
    }
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (hasAdminSelection) {
      shiftAdminSelectedSlots(-1);
    } else {
      shiftSelectedSlots(-1);
    }
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (hasAdminSelection) {
      shiftAdminSelectedSlots(1);
    } else {
      shiftSelectedSlots(1);
    }
  }
  if (/^\d$/.test(event.key)) {
    capacityBuffer += event.key;
    if (capacityTimer) clearTimeout(capacityTimer);
    capacityTimer = setTimeout(() => {
      if (hasAdminSelection) {
        setAdminSelectedSlotCapacity(capacityBuffer);
      } else if (hasNewSelection) {
        setSelectedSlotCapacity(capacityBuffer);
      }
      capacityBuffer = "";
    }, 700);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(registerStatus, "提交中...");
  try {
    const payload = toJsonForm(registerForm);
    if (payload.password !== payload.password_confirm) {
      setStatus(registerStatus, "两次输入的密码不一致", true);
      return;
    }
    payload.consent = payload.consent === "on";
    delete payload.password_confirm;
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
    const credential = String(payload.credential || "").trim();
    if (!credential) {
      setStatus(loginStatus, "请输入系统内ID或身份证号", true);
      return;
    }
    if (/^u\d+/i.test(credential)) {
      payload.user_uid = credential.toUpperCase();
    } else {
      payload.idcard = credential;
    }
    delete payload.credential;
    const data = await apiRequest("/login", { method: "POST", json: payload });
    state.token = data.token;
    state.role = data.role;
    localStorage.setItem("subjinfo_token", data.token);
    setStatus(loginStatus, "登录成功");
    await loadProfile();
    await loadExperiments();
    if (state.role === "admin" || state.role === "root") {
      await loadAdminExperiments();
      await loadAdminExperimentList();
    }
    profileCard.scrollIntoView({ behavior: "smooth", block: "start" });
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

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(passwordStatus, "提交中...");
  try {
    const payload = toJsonForm(passwordForm);
    if (payload.new_password !== payload.new_password_confirm) {
      setStatus(passwordStatus, "两次输入的密码不一致", true);
      return;
    }

    if (state.role === "root" && payload.target_user_uid) {
      if (!payload.root_password) {
        setStatus(passwordStatus, "需要输入Root密码", true);
        return;
      }
      await apiRequest("/password/update", {
        method: "POST",
        json: {
          target_user_uid: payload.target_user_uid,
          root_password: payload.root_password,
          new_password: payload.new_password,
        },
      });
      setStatus(passwordStatus, "已更新目标用户密码");
    } else {
      if (!payload.current_password) {
        setStatus(passwordStatus, "请输入当前密码", true);
        return;
      }
      await apiRequest("/password/update", {
        method: "POST",
        json: {
          current_password: payload.current_password,
          new_password: payload.new_password,
        },
      });
      setStatus(passwordStatus, "密码已更新");
    }
    passwordForm.reset();
  } catch (error) {
    setStatus(passwordStatus, error.message, true);
  }
});

adminExperimentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(adminExperimentStatus, "正在发布...");
  try {
    const payload = toJsonForm(adminExperimentForm);
    const location = payload.location === "其他" ? payload.location_custom : payload.location;
    if (!location) {
      setStatus(adminExperimentStatus, "请填写实验地点", true);
      return;
    }

    const scheduleRequiredValue = payload.schedule_required === "yes";
    const schedulePayload = scheduleRequiredValue ? buildSchedulePayload() : [];
    const requestPayload = {
      name: payload.name,
      type: payload.type,
      location,
      location_link: payload.location_link,
      description: payload.description,
      notes: payload.notes,
      duration_min: payload.duration_min,
      reward: payload.reward,
      schedule_required: scheduleRequiredValue,
      conditions_text: adminConditions.value,
      quotas_text: adminQuota.value,
      schedule_slots: schedulePayload,
      device_info: navigator.platform || "",
      browser_info: navigator.userAgent || "",
    };

    const result = await apiRequest("/admin/experiment/create", {
      method: "POST",
      json: requestPayload,
    });

    setStatus(adminExperimentStatus, `发布成功，实验编号 ${result.experiment_uid}`);
    scheduleState.slots = [];
    adminExperimentForm.reset();
    scheduleEditor?.classList.add("hidden");
    await loadAdminExperiments();
    await loadAdminExperimentList();
  } catch (error) {
    setStatus(adminExperimentStatus, error.message, true);
    if (error.message.includes("无法解析")) {
      alert("入组条件或名额分配格式不正确。示例：\n年龄>=18 & 年龄<30 & (左眼近视度数<600|右眼近视度数<600)\nALL*20");
    }
  }
});

experimentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(experimentStatus, "请在实验卡片中选择报名或预约时间", true);
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
  state.experiments = [];
  state.adminExperiments = [];
  renderProfile();
});

loadProfile();
loadUnits();
renderScheduleGrid();

if (window.matchMedia && window.matchMedia("(orientation: portrait)").matches) {
  setProfilePaneCollapsed(true);
}

scheduleEditor?.classList.toggle("hidden", scheduleRequired?.value !== "yes");
locationSelect?.dispatchEvent(new Event("change"));
