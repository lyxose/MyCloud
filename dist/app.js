const API_BASE = "/api";

const state = {
  token: localStorage.getItem("subjinfo_token"),
  profile: null,
  role: null,
  experiments: [],
  adminExperiments: [],
  adminActiveTab: "new",
  selectedExperimentUid: null,
  selectedSlotIds: new Set(),
  experimentSlots: {},
};

const adminEditState = {
  experiment: null,
  slots: [],
  participants: {},
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
const authCard = document.getElementById("auth");
const consentSection = document.getElementById("consent");
const profilePane = document.getElementById("profilePane");
const profileToggle = document.getElementById("profileToggle");
const profileSplit = document.querySelector(".split");

const unitInput = document.getElementById("unitInput");
const unitSuggestions = document.getElementById("unitSuggestions");

const changePasswordBtn = document.getElementById("changePasswordBtn");
const passwordPanel = document.getElementById("passwordPanel");
const passwordPanelClose = document.getElementById("passwordPanelClose");
const passwordForm = document.getElementById("passwordForm");
const passwordStatus = document.getElementById("passwordStatus");
const rootPasswordSection = document.getElementById("rootPasswordSection");
const contactPanel = document.getElementById("contactPanel");
const contactForm = document.getElementById("contactForm");
const contactStatus = document.getElementById("contactStatus");

const adminArea = document.getElementById("adminArea");
const adminTabs = document.getElementById("adminTabs");
const adminPanelNew = document.getElementById("adminPanelNew");
const adminExperimentForm = document.getElementById("adminExperimentForm");
const adminExperimentStatus = document.getElementById("adminExperimentStatus");
const adminContactPhone = document.getElementById("adminContactPhone");
const adminConditions = document.getElementById("adminConditions");
const adminQuota = document.getElementById("adminQuota");
const quotaHelpBubble = document.getElementById("quotaHelpBubble");
const scheduleEditor = document.getElementById("scheduleEditor");
const scheduleGrid = document.getElementById("scheduleGrid");
const schedulePrev = document.getElementById("schedulePrev");
const scheduleNext = document.getElementById("scheduleNext");
const scheduleFill = document.getElementById("scheduleFill");
const scheduleRefresh = document.getElementById("scheduleRefresh");
const scheduleTitle = document.getElementById("scheduleTitle");
const scheduleUp = document.getElementById("scheduleUp");
const scheduleDown = document.getElementById("scheduleDown");
const scheduleRequired = document.getElementById("scheduleRequired");
const scheduleSlotsRequiredField = document.getElementById("scheduleSlotsRequiredField");
const scheduleSlotsRequired = document.getElementById("scheduleSlotsRequired");
const locationSelect = document.getElementById("locationSelect");
const locationLinkField = document.getElementById("locationLinkField");
const locationCustomField = document.getElementById("locationCustomField");

const adminExperimentsSection = document.getElementById("adminExperiments");
const adminExperimentList = document.getElementById("adminExperimentList");
const adminExperimentsRefresh = document.getElementById("adminExperimentsRefresh");

const VIEW_START_DEFAULT = 9 * 60;
const VIEW_END_DEFAULT = 18 * 60;
const VIEW_STEP_MIN = 60;
const IS_COARSE_POINTER = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

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
    let message = data?.error || data?.detail || data || "请求失败";
    if (data?.error === "Server error" && data?.detail) {
      message = data.detail;
    }
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
  document.body.classList.toggle("is-admin", isAdmin);
  profilePane?.classList.toggle("hidden", isAdmin);
  experimentForm?.classList.toggle("hidden", isAdmin);
  profileSplit?.classList.toggle("hidden", isAdmin);
  profileToggle?.classList.toggle("hidden", isAdmin);
  adminArea?.classList.toggle("hidden", !isAdmin);
  adminExperimentsSection?.classList.toggle("hidden", !isAdmin);
  consentSection?.classList.toggle("hidden", isAdmin);
  rootPasswordSection?.classList.toggle("hidden", state.role !== "root");
  contactPanel?.classList.toggle("hidden", !isAdmin);
}

function populateProfileForm(profile) {
  if (!profile) return;
  const mapping = {
    alipay_phone: profile.alipay_phone,
    unit: profile.unit,
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

  const ethnicityField = profileForm?.elements?.namedItem?.("ethnicity");
  if (ethnicityField) {
    ethnicityField.value = profile.ethnicity ?? "";
    ethnicityField.disabled = !!profile.ethnicity;
  }

  const contactMapping = {
    alipay_phone: profile.alipay_phone,
    wechat: profile.wechat,
  };
  Object.entries(contactMapping).forEach(([key, value]) => {
    const field = contactForm?.elements?.namedItem?.(key);
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
    authCard?.classList.remove("hidden");
    return;
  }

  profileCard.classList.remove("hidden");
  profileEmpty.classList.add("hidden");
  profileArea.classList.remove("hidden");
  authCard?.classList.add("hidden");
  profileName.textContent = state.profile.name || "";
  profileUid.textContent = `系统内ID: ${state.profile.user_uid}`;
  profileMeta.textContent = `年龄: ${state.profile.age ?? "-"} | 单位: ${state.profile.unit ?? "-"}`;
  populateProfileForm(state.profile);
  applyRoleLayout();
  if (state.role === "admin" || state.role === "root") {
    profileSplit?.classList.add("hidden");
    profilePane?.classList.add("hidden");
    experimentForm?.classList.add("hidden");
  }
  if (adminContactPhone && state.profile.alipay_phone) {
    adminContactPhone.value = state.profile.alipay_phone;
  }
}

const PX_PER_MIN = 4 / 3;
let capacityBuffer = "";
let capacityTimer = null;

const scheduleState = {
  weekStart: startOfWeek(new Date()),
  slots: [],
  selectedIds: new Set(),
  activeDayIndex: 0,
  viewStartMin: VIEW_START_DEFAULT,
  viewEndMin: VIEW_END_DEFAULT,
};

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isDateBeforeToday(date) {
  const today = new Date();
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return normalized < today;
}

function buildTimeColumn(stateRef) {
  const dayEl = document.createElement("div");
  dayEl.className = "schedule-day schedule-time";
  const header = document.createElement("div");
  header.className = "schedule-day-header";
  header.textContent = "时间";

  const body = document.createElement("div");
  body.className = "schedule-day-body schedule-time-body";
  const timeline = document.createElement("div");
  timeline.className = "schedule-timeline";
  timeline.style.height = `${1440 * PX_PER_MIN}px`;
  for (let hour = 0; hour <= 24; hour += 1) {
    const hourLine = document.createElement("div");
    hourLine.className = "schedule-hour";
    hourLine.style.top = `${hour * 60 * PX_PER_MIN}px`;
    hourLine.textContent = `${String(hour).padStart(2, "0")}:00`;
    timeline.appendChild(hourLine);
  }

  applyViewWindow(body, timeline, stateRef);

  body.appendChild(timeline);
  dayEl.appendChild(header);
  dayEl.appendChild(body);
  return dayEl;
}

function formatDateLabel(date) {
  const week = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}/${date.getDate()} 周${week[date.getDay()]}`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getViewOffsetPx(stateRef) {
  return stateRef.viewStartMin * PX_PER_MIN;
}

function applyViewWindow(body, timeline, stateRef) {
  const windowMin = stateRef.viewEndMin - stateRef.viewStartMin;
  const height = Math.max(1, windowMin) * PX_PER_MIN;
  body.style.height = `${height}px`;
  timeline.style.transform = `translateY(-${getViewOffsetPx(stateRef)}px)`;
}

function shiftViewWindow(stateRef, deltaMin, renderFn) {
  const windowMin = stateRef.viewEndMin - stateRef.viewStartMin;
  let nextStart = stateRef.viewStartMin + deltaMin;
  if (nextStart < 0) nextStart = 0;
  if (nextStart + windowMin > 1440) nextStart = 1440 - windowMin;
  stateRef.viewStartMin = nextStart;
  stateRef.viewEndMin = nextStart + windowMin;
  renderFn();
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
  const prevDays = scheduleGrid.querySelector(".schedule-days");
  if (prevDays) scheduleScrollState.schedule = prevDays.scrollLeft;
  scheduleGrid.innerHTML = "";
  const days = buildWeekDates(scheduleState.weekStart);
  scheduleTitle.textContent = `${days[0].getMonth() + 1}/${days[0].getDate()} - ${days[6].getMonth() + 1}/${days[6].getDate()}`;
  const timeColumn = buildTimeColumn(scheduleState);
  const daysContainer = document.createElement("div");
  daysContainer.className = "schedule-days";

  scheduleGrid.appendChild(timeColumn);
  scheduleGrid.appendChild(daysContainer);
  daysContainer.scrollLeft = scheduleScrollState.schedule;
  daysContainer.addEventListener("scroll", () => {
    scheduleScrollState.schedule = daysContainer.scrollLeft;
  }, { passive: true });

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
    }, { passive: true });

    const body = document.createElement("div");
    body.className = "schedule-day-body";
    const timeline = document.createElement("div");
    timeline.className = "schedule-timeline";
    timeline.dataset.date = formatLocalDate(date);
    timeline.style.height = `${1440 * PX_PER_MIN}px`;

    for (let hour = 0; hour <= 24; hour += 1) {
      const hourLine = document.createElement("div");
      hourLine.className = "schedule-hour";
      hourLine.style.top = `${hour * 60 * PX_PER_MIN}px`;
      hourLine.textContent = "";
      timeline.appendChild(hourLine);
    }

    applyViewWindow(body, timeline, scheduleState);

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

    if (isDateBeforeToday(date)) {
      const past = document.createElement("div");
      past.className = "schedule-past";
      past.style.top = "0px";
      past.style.height = "100%";
      timeline.appendChild(past);
    }

    timeline.addEventListener("click", (event) => {
      if (event.target.classList.contains("schedule-slot")) return;
      if (isDateBeforeToday(date)) {
        setStatus(adminExperimentStatus, "不能选择今天之前的日期", true);
        return;
      }
      const rect = body.getBoundingClientRect();
      const offsetY = event.clientY - rect.top + getViewOffsetPx(scheduleState);
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
    }, { passive: true });

    scheduleState.slots
      .filter((slot) => slot.date === formatLocalDate(date))
      .forEach((slot) => {
        const slotEl = document.createElement("div");
        slotEl.className = "schedule-slot";
        if (slot.locked) {
          slotEl.classList.add("locked");
        }
        if (scheduleState.selectedIds.has(slot.id)) {
          slotEl.classList.add("selected");
        }
        slotEl.style.top = `${slot.startMin * PX_PER_MIN}px`;
        slotEl.style.height = `${(slot.endMin - slot.startMin) * PX_PER_MIN}px`;
        slotEl.dataset.id = slot.id;
        if (slot.locked) {
          const names = (slot.participants || []).map((p) => p.name).join("、") || "已预约";
          slotEl.innerHTML = `
            <div class="slot-time">
              <span class="slot-time-start">${formatMinutes(slot.startMin)}</span>
              <span class="slot-time-end">${formatMinutes(slot.endMin)}</span>
            </div>
            <div class="slot-count">${names}</div>
          `;
        } else {
          slotEl.innerHTML = `
            <div class="slot-time">
              <span class="slot-time-start">${formatMinutes(slot.startMin)}</span>
              <span class="slot-time-end">${formatMinutes(slot.endMin)}</span>
            </div>
            <div class="slot-count">${slot.capacity}人</div>
            <div class="slot-handle top">▲</div>
            <div class="slot-handle bottom">▼</div>
          `;
        }

        slotEl.addEventListener("click", (event) => {
          event.stopPropagation();
          if (event.ctrlKey || event.metaKey) {
            toggleSlotSelection(slot.id);
          } else {
            scheduleState.selectedIds = new Set([slot.id]);
          }
          renderScheduleGrid();
        }, { passive: true });

        const deleteSlot = () => {
          scheduleState.slots = scheduleState.slots.filter((item) => item.id !== slot.id);
          scheduleState.selectedIds.delete(slot.id);
          renderScheduleGrid();
        };
        const editCapacity = () => {
          const value = prompt("设置人数", String(slot.capacity || 1));
          const num = Number(value);
          if (!Number.isNaN(num) && num > 0) {
            slot.capacity = num;
            renderScheduleGrid();
          }
        };
        attachMobileSlotHandlers(slotEl, slot, scheduleState, renderScheduleGrid, deleteSlot, editCapacity);

        enableSlotDrag(slotEl, slot, scheduleState, renderScheduleGrid);
        enableSlotResize(slotEl, slot, renderScheduleGrid, scheduleState);
        timeline.appendChild(slotEl);
      });

    body.appendChild(timeline);
    dayEl.appendChild(header);
    dayEl.appendChild(body);
    daysContainer.appendChild(dayEl);
  });
}

function addScheduleSlot({ date, startMin, endMin, capacity }) {
  const dateKey = formatLocalDate(date);
  const existing = scheduleState.slots.find(
    (slot) => slot.date === dateKey && slot.startMin === startMin && slot.endMin === endMin && !slot.locked
  );
  if (existing) {
    existing.capacity += capacity || 1;
    return;
  }
  scheduleState.slots.push({
    id: `slot_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    date: dateKey,
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

function mergeOverlappingSlots(stateRef) {
  const merged = [];
  const map = new Map();
  stateRef.slots.forEach((slot) => {
    const key = `${slot.date}-${slot.startMin}-${slot.endMin}`;
    const existing = map.get(key);
    if (existing && !existing.locked && !slot.locked) {
      existing.capacity += slot.capacity || 1;
      return;
    }
    map.set(key, slot);
    merged.push(slot);
  });
  stateRef.slots = merged;
}

let slotActionMenu = null;
let slotActionMenuCloseHandler = null;

function closeSlotActionMenu() {
  if (!slotActionMenu) return;
  if (slotActionMenuCloseHandler) {
    document.removeEventListener("touchstart", slotActionMenuCloseHandler);
    slotActionMenuCloseHandler = null;
  }
  slotActionMenu.remove();
  slotActionMenu = null;
}

function openSlotActionMenu(x, y, actions) {
  closeSlotActionMenu();
  const menu = document.createElement("div");
  menu.className = "slot-action-menu";
  actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    if (action.danger) btn.classList.add("danger");
    btn.addEventListener("click", () => {
      closeSlotActionMenu();
      action.onClick();
    });
    menu.appendChild(btn);
  });
  menu.style.left = `${Math.min(x, window.innerWidth - 160)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 160)}px`;
  document.body.appendChild(menu);
  slotActionMenu = menu;
  slotActionMenuCloseHandler = (event) => {
    if (!menu.contains(event.target)) closeSlotActionMenu();
  };
  document.addEventListener("touchstart", slotActionMenuCloseHandler, { passive: true });
}

function startTouchDrag(slot, stateRef, renderFn, startY) {
  let dragStartY = startY;
  let dragStartMin = slot.startMin;
  let dragEndMin = slot.endMin;
  const onMove = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    const delta = touch.clientY - dragStartY;
    const step = Math.round(delta / (PX_PER_MIN * 10)) * 10;
    const duration = dragEndMin - dragStartMin;
    let nextStart = Math.max(0, Math.min(1440 - duration, dragStartMin + step));
    if (slot.date === formatLocalDate(new Date())) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      if (dragStartMin >= nowMin && nextStart < nowMin) nextStart = nowMin;
    }
    slot.startMin = nextStart;
    slot.endMin = nextStart + duration;
    renderFn();
    event.preventDefault();
  };
  const onEnd = () => {
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    mergeOverlappingSlots(stateRef);
    renderFn();
  };
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);
}

function startTouchResize(slotEl, slot, stateRef, renderFn, startY) {
  let resizeEdge = null;
  const body = slotEl.closest(".schedule-day-body");
  if (!body) return;
  const bodyTop = body.getBoundingClientRect().top;
  const viewOffset = getViewOffsetPx(stateRef);
  const onMove = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    if (!resizeEdge) {
      const rect = slotEl.getBoundingClientRect();
      resizeEdge = touch.clientY < rect.top + rect.height / 2 ? "top" : "bottom";
    }
    const offsetY = touch.clientY - bodyTop + viewOffset;
    const targetMin = Math.max(0, Math.round(offsetY / PX_PER_MIN / 10) * 10);
    const minDuration = 10;
    if (resizeEdge === "top") {
      let nextStart = Math.min(slot.endMin - minDuration, targetMin);
      if (slot.date === formatLocalDate(new Date())) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        if (nextStart < nowMin) nextStart = nowMin;
      }
      slot.startMin = Math.max(0, nextStart);
    } else {
      let nextEnd = Math.max(slot.startMin + minDuration, targetMin);
      slot.endMin = Math.min(1440, nextEnd);
    }
    renderFn();
    event.preventDefault();
  };
  const onEnd = () => {
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    mergeOverlappingSlots(stateRef);
    renderFn();
  };
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);
}

function attachMobileSlotHandlers(slotEl, slot, stateRef, renderFn, onDelete, onCapacityEdit, onLockedTap) {
  let pressTimer = null;
  let moved = false;
  let longPressed = false;
  let startX = 0;
  let startY = 0;

  const cancelPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
  };

  slotEl.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    moved = false;
    longPressed = false;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    cancelPress();
    pressTimer = setTimeout(() => {
      longPressed = true;
      if (slot.locked) return;
      openSlotActionMenu(startX, startY, [
        {
          label: "拖动",
          onClick: () => startTouchDrag(slot, stateRef, renderFn, startY),
        },
        {
          label: "调整时长",
          onClick: () => startTouchResize(slotEl, slot, stateRef, renderFn, startY),
        },
        {
          label: "删除",
          danger: true,
          onClick: onDelete,
        },
      ]);
    }, 500);
  }, { passive: true });

  slotEl.addEventListener("touchmove", (event) => {
    if (!pressTimer) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);
    if (dx > 6 || dy > 6) {
      moved = true;
      cancelPress();
    }
  }, { passive: true });

  slotEl.addEventListener("touchend", (event) => {
    cancelPress();
    if (longPressed || moved) return;
    if (slot.locked) {
      onLockedTap?.(event);
      return;
    }
    if (stateRef.selectedIds.has(slot.id)) {
      onCapacityEdit();
      return;
    }
    stateRef.selectedIds = new Set([slot.id]);
    renderFn();
  }, { passive: true });
}

function enableSlotDrag(slotEl, slot, stateRef, renderFn) {
  if (isDateBeforeToday(new Date(`${slot.date}T00:00:00`))) return;
  if (slot.locked) return;
  if (IS_COARSE_POINTER) return;
  let startX = 0;
  let startY = 0;
  let startMin = slot.startMin;
  let endMin = slot.endMin;
  let dragging = false;

  const onMove = (event) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      dragging = true;
    }
    const delta = event.clientY - startY;
    const step = Math.round(delta / (PX_PER_MIN * 10)) * 10;
    const duration = endMin - startMin;
    let nextStart = Math.max(0, Math.min(1440 - duration, startMin + step));
    if (slot.date === formatLocalDate(new Date())) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      if (startMin >= nowMin && nextStart < nowMin) nextStart = nowMin;
    }
    let nextEnd = nextStart + duration;
    slot.startMin = nextStart;
    slot.endMin = nextEnd;
    renderFn();
  };

  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    if (dragging) {
      mergeOverlappingSlots(stateRef);
      renderFn();
    }
    dragging = false;
  };

  slotEl.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    dragging = false;
    startX = event.clientX;
    startY = event.clientY;
    startMin = slot.startMin;
    endMin = slot.endMin;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  let pressTimer = null;
  slotEl.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    pressTimer = setTimeout(() => {
      dragging = true;
      startY = event.touches[0].clientY;
      startMin = slot.startMin;
      endMin = slot.endMin;
    }, 350);
  });

  slotEl.addEventListener("touchmove", (event) => {
    if (!dragging) return;
    const fakeEvent = { clientY: event.touches[0].clientY };
    onMove(fakeEvent);
    event.preventDefault();
  }, { passive: false });

  slotEl.addEventListener("touchend", () => {
    if (pressTimer) clearTimeout(pressTimer);
    if (dragging) onUp();
  });
}

function enableSlotResize(slotEl, slot, renderFn, stateRef) {
  if (isDateBeforeToday(new Date(`${slot.date}T00:00:00`))) return;
  if (slot.locked) return;
  if (IS_COARSE_POINTER) return;
  const topHandle = slotEl.querySelector(".slot-handle.top");
  const bottomHandle = slotEl.querySelector(".slot-handle.bottom");
  if (!topHandle || !bottomHandle) return;

  let resizing = null;
  let resizeContext = null;

  const handleResize = (clientY) => {
    if (!resizeContext) return;
    const offsetY = clientY - resizeContext.bodyTop + resizeContext.viewOffset;
    const targetMin = Math.max(0, Math.round(offsetY / PX_PER_MIN / 10) * 10);
    const minDuration = 10;

    if (resizing === "top") {
      let nextStart = Math.min(slot.endMin - minDuration, targetMin);
      if (slot.date === formatLocalDate(new Date())) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        if (nextStart < nowMin) nextStart = nowMin;
      }
      slot.startMin = Math.max(0, nextStart);
    }

    if (resizing === "bottom") {
      let nextEnd = Math.max(slot.startMin + minDuration, targetMin);
      slot.endMin = Math.min(1440, nextEnd);
    }

    renderFn();
  };

  const onMove = (event) => {
    if (!resizing) return;
    handleResize(event.clientY);
  };

  const onUp = () => {
    resizing = null;
    resizeContext = null;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    mergeOverlappingSlots(stateRef);
    renderFn();
  };

  const bindHandle = (handle, edge) => {
    handle.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      const body = slotEl.closest(".schedule-day-body");
      if (!body) return;
      resizeContext = {
        bodyTop: body.getBoundingClientRect().top,
        viewOffset: getViewOffsetPx(stateRef),
      };
      resizing = edge;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    handle.addEventListener("touchstart", (event) => {
      event.stopPropagation();
      const body = slotEl.closest(".schedule-day-body");
      if (!body) return;
      resizeContext = {
        bodyTop: body.getBoundingClientRect().top,
        viewOffset: getViewOffsetPx(stateRef),
      };
      resizing = edge;
    });

    handle.addEventListener("touchmove", (event) => {
      if (!resizing) return;
      handleResize(event.touches[0].clientY);
      event.preventDefault();
    }, { passive: false });

    handle.addEventListener("touchend", () => {
      resizing = null;
      resizeContext = null;
    });
  };

  bindHandle(topHandle, "top");
  bindHandle(bottomHandle, "bottom");
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

const scheduleScrollState = {
  schedule: 0,
  admin: 0,
};

const adminScheduleState = {
  weekStart: startOfWeek(new Date()),
  slots: [],
  selectedIds: new Set(),
  activeDayIndex: 0,
  viewStartMin: VIEW_START_DEFAULT,
  viewEndMin: VIEW_END_DEFAULT,
};

function renderAdminEditScheduleGrid() {
  const container = document.getElementById("adminEditScheduleGrid");
  if (!container) return;
  const prevDays = container.querySelector(".schedule-days");
  if (prevDays) scheduleScrollState.admin = prevDays.scrollLeft;
  container.innerHTML = "";
  const days = buildWeekDates(adminScheduleState.weekStart);

  const title = document.getElementById("adminEditScheduleTitle");
  if (title && days.length) {
    title.textContent = `${days[0].getMonth() + 1}/${days[0].getDate()} - ${days[6].getMonth() + 1}/${days[6].getDate()}`;
  }

  const timeColumn = buildTimeColumn(adminScheduleState);
  const daysContainer = document.createElement("div");
  daysContainer.className = "schedule-days";
  container.appendChild(timeColumn);
  container.appendChild(daysContainer);
  daysContainer.scrollLeft = scheduleScrollState.admin;
  daysContainer.addEventListener("scroll", () => {
    scheduleScrollState.admin = daysContainer.scrollLeft;
  }, { passive: true });

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
    }, { passive: true });

    const body = document.createElement("div");
    body.className = "schedule-day-body";
    const timeline = document.createElement("div");
    timeline.className = "schedule-timeline";
    timeline.dataset.date = formatLocalDate(date);
    timeline.style.height = `${1440 * PX_PER_MIN}px`;

    for (let hour = 0; hour <= 24; hour += 1) {
      const hourLine = document.createElement("div");
      hourLine.className = "schedule-hour";
      hourLine.style.top = `${hour * 60 * PX_PER_MIN}px`;
      hourLine.textContent = "";
      timeline.appendChild(hourLine);
    }

    applyViewWindow(body, timeline, adminScheduleState);

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

    if (isDateBeforeToday(date)) {
      const past = document.createElement("div");
      past.className = "schedule-past";
      past.style.top = "0px";
      past.style.height = "100%";
      timeline.appendChild(past);
    }

    timeline.addEventListener("click", (event) => {
      if (event.target.classList.contains("schedule-slot")) return;
      if (isDateBeforeToday(date)) {
        setStatus(adminExperimentStatus, "不能选择今天之前的日期", true);
        return;
      }
      const rect = body.getBoundingClientRect();
      const offsetY = event.clientY - rect.top + getViewOffsetPx(adminScheduleState);
      const startMin = Math.max(0, Math.round(offsetY / PX_PER_MIN / 10) * 10);
      const durationMin = Number(adminEditState.experiment?.duration_min || 0);
      if (!durationMin) return;
      const endMin = Math.min(1440, startMin + durationMin);
      addAdminScheduleSlot({ date, startMin, endMin, capacity: 1 });
      renderAdminEditScheduleGrid();
    }, { passive: true });

    adminScheduleState.slots
      .filter((slot) => slot.date === formatLocalDate(date))
      .forEach((slot) => {
        const slotEl = document.createElement("div");
        slotEl.className = "schedule-slot";
        if (slot.locked) {
          slotEl.classList.add("locked");
        }
        const isExpired = isDateBeforeToday(date)
          || (date.toDateString() === new Date().toDateString()
            && slot.endMin <= (new Date().getHours() * 60 + new Date().getMinutes()));
        if (isExpired) {
          slotEl.classList.add("expired");
        }
        if (adminScheduleState.selectedIds.has(slot.id)) {
          slotEl.classList.add("selected");
        }
        slotEl.style.top = `${slot.startMin * PX_PER_MIN}px`;
        slotEl.style.height = `${(slot.endMin - slot.startMin) * PX_PER_MIN}px`;
        slotEl.dataset.id = slot.id;
        if (slot.locked) {
          const names = (slot.participants || []).map((p) => p.name).join("、") || "已预约";
          slotEl.innerHTML = `
            <div class="slot-time">
              <span class="slot-time-start">${formatMinutes(slot.startMin)}</span>
              <span class="slot-time-end">${formatMinutes(slot.endMin)}</span>
            </div>
            <div class="slot-count">${names}</div>
          `;
        } else {
          slotEl.innerHTML = `
            <div class="slot-time">
              <span class="slot-time-start">${formatMinutes(slot.startMin)}</span>
              <span class="slot-time-end">${formatMinutes(slot.endMin)}</span>
            </div>
            <div class="slot-count">${slot.capacity}人</div>
            <div class="slot-handle top">▲</div>
            <div class="slot-handle bottom">▼</div>
          `;
        }

        slotEl.addEventListener("click", (event) => {
          event.stopPropagation();
          if (slot.locked) {
            const contacts = (slot.participants || [])
              .map((p) => {
                const info = adminEditState.participants?.[p.user_uid] || {};
                return `${p.name} ${info.alipay_phone || "-"} ${info.wechat || "-"}`;
              })
              .join("\n");
            if (contacts) {
              showTooltip(contacts, event.pageX + 8, event.pageY + 8);
            }
            return;
          }
          if (event.ctrlKey || event.metaKey) {
            toggleAdminSlotSelection(slot.id);
          } else {
            adminScheduleState.selectedIds = new Set([slot.id]);
          }
          renderAdminEditScheduleGrid();
        }, { passive: true });

        const deleteSlot = () => {
          if (slot.locked) return;
          adminScheduleState.slots = adminScheduleState.slots.filter((item) => item.id !== slot.id);
          adminScheduleState.selectedIds.delete(slot.id);
          renderAdminEditScheduleGrid();
        };
        const editCapacity = () => {
          if (slot.locked) return;
          const value = prompt("设置人数", String(slot.capacity || 1));
          const num = Number(value);
          if (!Number.isNaN(num) && num > 0) {
            slot.capacity = num;
            renderAdminEditScheduleGrid();
          }
        };
        const lockedTap = (touchEvent) => {
          if (!slot.locked) return;
          const touch = touchEvent.changedTouches?.[0];
          const contacts = (slot.participants || [])
            .map((p) => {
              const info = adminEditState.participants?.[p.user_uid] || {};
              return `${p.name} ${info.alipay_phone || "-"} ${info.wechat || "-"}`;
            })
            .join("\n");
          if (contacts && touch) {
            showTooltip(contacts, touch.clientX + 8, touch.clientY + 8);
          }
        };
        attachMobileSlotHandlers(slotEl, slot, adminScheduleState, renderAdminEditScheduleGrid, deleteSlot, editCapacity, lockedTap);

        if (!slot.locked) {
          enableAdminSlotDrag(slotEl, slot, adminScheduleState, renderAdminEditScheduleGrid);
          enableSlotResize(slotEl, slot, renderAdminEditScheduleGrid, adminScheduleState);
        }
        timeline.appendChild(slotEl);
      });

    body.appendChild(timeline);
    dayEl.appendChild(header);
    dayEl.appendChild(body);
    daysContainer.appendChild(dayEl);
  });
}

function addAdminScheduleSlot({ date, startMin, endMin, capacity }) {
  const dateKey = formatLocalDate(date);
  const existing = adminScheduleState.slots.find(
    (slot) => slot.date === dateKey && slot.startMin === startMin && slot.endMin === endMin && !slot.locked
  );
  if (existing) {
    existing.capacity += capacity || 1;
    return;
  }
  adminScheduleState.slots.push({
    id: `slot_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    date: dateKey,
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

function enableAdminSlotDrag(slotEl, slot, stateRef, renderFn) {
  if (isDateBeforeToday(new Date(`${slot.date}T00:00:00`))) return;
  if (IS_COARSE_POINTER) return;
  let startX = 0;
  let startY = 0;
  let startMin = slot.startMin;
  let endMin = slot.endMin;
  let dragging = false;

  const onMove = (event) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      dragging = true;
    }
    const delta = event.clientY - startY;
    const step = Math.round(delta / (PX_PER_MIN * 10)) * 10;
    const duration = endMin - startMin;
    let nextStart = Math.max(0, Math.min(1440 - duration, startMin + step));
    if (slot.date === formatLocalDate(new Date())) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      if (startMin >= nowMin && nextStart < nowMin) nextStart = nowMin;
    }
    slot.startMin = nextStart;
    slot.endMin = nextStart + duration;
    renderFn();
  };

  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    if (dragging) {
      mergeOverlappingSlots(stateRef);
      renderFn();
    }
    dragging = false;
  };

  slotEl.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    dragging = false;
    startX = event.clientX;
    startY = event.clientY;
    startMin = slot.startMin;
    endMin = slot.endMin;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  let pressTimer = null;
  slotEl.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    pressTimer = setTimeout(() => {
      dragging = true;
      startY = event.touches[0].clientY;
      startMin = slot.startMin;
      endMin = slot.endMin;
    }, 350);
  });

  slotEl.addEventListener("touchmove", (event) => {
    if (!dragging) return;
    const fakeEvent = { clientY: event.touches[0].clientY };
    onMove(fakeEvent);
    event.preventDefault();
  }, { passive: false });

  slotEl.addEventListener("touchend", () => {
    if (pressTimer) clearTimeout(pressTimer);
    if (dragging) onUp();
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

function parseSlotParticipants(slot) {
  try {
    return JSON.parse(slot.participants_json || "[]");
  } catch {
    return [];
  }
}

function convertSlotToSchedule(slot) {
  if (!slot.start_time || !slot.end_time) return null;
  const start = new Date(slot.start_time);
  const end = new Date(slot.end_time);
  return {
    id: `existing_${slot.id}`,
    originalId: slot.id,
    date: formatLocalDate(start),
    startMin: start.getHours() * 60 + start.getMinutes(),
    endMin: end.getHours() * 60 + end.getMinutes(),
    capacity: slot.capacity || 1,
    locked: slot.locked === 1,
    participants: parseSlotParticipants(slot),
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
    if (state.selectedExperimentUid) {
      const exists = state.experiments.some((exp) => exp.experiment_uid === state.selectedExperimentUid);
      if (!exists) {
        state.selectedExperimentUid = null;
        state.selectedSlotIds.clear();
      }
    }
    renderExperiments();
  } catch (error) {
    state.experiments = [];
  }
}

function clearExperimentSelection() {
  state.selectedExperimentUid = null;
  state.selectedSlotIds.clear();
}

function setSelectedExperiment(exp, slot) {
  if (!exp) {
    clearExperimentSelection();
    renderExperiments();
    return;
  }

  if (!exp.schedule_required && state.selectedExperimentUid === exp.experiment_uid) {
    clearExperimentSelection();
    renderExperiments();
    setStatus(experimentStatus, "已取消选中");
    return;
  }

  state.selectedExperimentUid = exp.experiment_uid;
  state.selectedSlotIds.clear();
  if (slot?.id) state.selectedSlotIds.add(String(slot.id));
  renderExperiments();

  if (exp.schedule_required) {
    if (slot) {
      setStatus(
        experimentStatus,
        `已选择时间段：${formatSlotDateTime(slot.start_time)} - ${formatSlotTime(slot.end_time)}`
      );
    } else {
      setStatus(experimentStatus, "请选择预约时间段");
    }
  } else {
    setStatus(experimentStatus, `已选中实验：${exp.name}`);
  }
}

function parseSlotRequirement(value) {
  const raw = String(value || "=1").trim();
  const match = raw.match(/^(==|=|>=|<=|>|<)\s*(\d+)$/);
  if (!match) return { operator: "=", count: 1, raw: "=1" };
  const operator = match[1] === "==" ? "=" : match[1];
  return { operator, count: Number(match[2]), raw: `${operator}${Number(match[2])}` };
}

function toggleScheduleSlotSelection(exp, slot, slots) {
  state.selectedExperimentUid = exp.experiment_uid;
  const key = String(slot.id);
  if (state.selectedSlotIds.has(key)) {
    state.selectedSlotIds.delete(key);
  } else {
    state.selectedSlotIds.add(key);
  }
  renderExperimentSlots(exp, slots);
  const count = state.selectedSlotIds.size;
  setStatus(experimentStatus, count > 0 ? `已选择 ${count} 个时间段` : "请选择预约时间段");
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
    const isSelected = state.selectedExperimentUid === exp.experiment_uid;
    if (isSelected) card.classList.add("selected");
    const eligibility = exp.eligibility?.ok
      ? "可报名"
      : exp.eligibility?.reason === "您所属分组已满员"
        ? "名额已满"
        : exp.eligibility?.reason || "暂不可报名";
    const actionHtml = exp.schedule_required
      ? `<button type="button" class="ghost" data-action="detail">查看详情</button>`
      : `<button type="button" class="primary" data-action="select">${isSelected ? "已选中" : "选中"}</button>`;
    card.innerHTML = `
      <div class="experiment-card-header">
        <strong>${exp.name}</strong>
        <span>${exp.type}</span>
      </div>
      <div class="experiment-card-body">
        <p>${exp.description || "暂无简介"}</p>
        ${exp.schedule_required ? `<p class="hint">预约数量要求：${exp.schedule_slots_required || "=1"} 个时段</p>` : ""}
        <p class="hint">${eligibility}</p>
      </div>
      <div class="experiment-card-actions">
        ${actionHtml}
      </div>
    `;

    const detailBtn = card.querySelector("[data-action='detail']");
    const selectBtn = card.querySelector("[data-action='select']");

    detailBtn?.addEventListener("click", () => showExperimentDetail(exp));
    selectBtn?.addEventListener("click", () => setSelectedExperiment(exp, null));

    container.appendChild(card);
  });

  if (state.selectedExperimentUid) {
    const selected = state.experiments.find((exp) => exp.experiment_uid === state.selectedExperimentUid);
    if (selected?.schedule_required) {
      const slots = state.experimentSlots[selected.experiment_uid] || [];
      renderExperimentSlots(selected, slots);
    }
  }
}

async function loadAdminExperiments() {
  if (!(state.role === "admin" || state.role === "root")) return;
  try {
    const data = await apiRequest("/admin/experiments", { method: "GET" });
    state.adminExperiments = data.experiments || [];
    renderAdminTabs();
    if (state.adminActiveTab !== "new") {
      await loadAdminExperimentDetail(state.adminActiveTab);
    }
  } catch {
    state.adminExperiments = [];
  }
}

function renderAdminTabs() {
  if (!adminTabs) return;
  adminTabs.innerHTML = "";
  const newTab = document.createElement("button");
  newTab.className = "tab";
  newTab.dataset.adminTab = "new";
  newTab.textContent = "新实验";
  newTab.addEventListener("click", () => selectAdminTab("new"));
  adminTabs.appendChild(newTab);

  const sortedExperiments = [...state.adminExperiments].sort((a, b) => {
    const aTime = Date.parse(a.updated_at || a.created_at || 0);
    const bTime = Date.parse(b.updated_at || b.created_at || 0);
    return bTime - aTime;
  });

  sortedExperiments.forEach((exp) => {
    const tab = document.createElement("button");
    tab.className = "tab";
    tab.dataset.adminTab = exp.experiment_uid;
    tab.textContent = exp.name;
    const updatedLabel = exp.updated_at ? new Date(exp.updated_at).toLocaleString() : "-";
    const recruited = exp.recruited_count ?? 0;
    const capacity = exp.capacity_total ?? 0;
    tab.title = `ID: ${exp.experiment_uid}\n类型: ${exp.type}\n已招募: ${recruited}/${capacity}\n最后修改: ${updatedLabel}`;
    tab.addEventListener("click", () => selectAdminTab(exp.experiment_uid));
    adminTabs.appendChild(tab);
  });

  const validTabs = new Set(["new", ...state.adminExperiments.map((exp) => exp.experiment_uid)]);
  if (!validTabs.has(state.adminActiveTab)) {
    state.adminActiveTab = "new";
  }

  adminTabs.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.adminTab === state.adminActiveTab);
  });

  applyAdminPanelState(state.adminActiveTab);
}

function applyAdminPanelState(tabKey) {
  const panel = document.getElementById("adminPanelExperiments");
  if (tabKey === "new") {
    adminPanelNew.classList.add("active");
    panel?.classList.remove("active");
    return;
  }
  adminPanelNew.classList.remove("active");
  panel?.classList.add("active");
}

async function selectAdminTab(tabKey) {
  state.adminActiveTab = tabKey;
  renderAdminTabs();
  if (tabKey === "new") {
    adminEditState.experiment = null;
    return;
  }
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
  adminEditState.participants = participants || {};
  adminScheduleState.weekStart = startOfWeek(new Date());
  adminScheduleState.activeDayIndex = 0;
  adminScheduleState.slots = [];
  adminScheduleState.selectedIds.clear();
  panel.innerHTML = `
    <div class="admin-layout">
      <div class="admin-left">
        <h4>${experiment.name}</h4>
        <p class="hint">实验ID：${experiment.experiment_uid}</p>
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
        <div class="info-card">
          <strong>设置说明（入组条件 + 名额分配）</strong>
                    <p>1) 入组条件写法：字段 + 比较符号 + 值；支持 <span class="mono">=</span>、<span class="mono">!=</span>、<span class="mono">≠</span>、<span class="mono">&gt;</span>、<span class="mono">&lt;</span>、<span class="mono">&gt;=</span>、<span class="mono">&lt;=</span>；使用 <span class="mono">&</span> 表示同时满足，<span class="mono">|</span> 表示二选一，括号用于分组。</p>
                    <p>可用字段：<span class="mono">年龄</span>、<span class="mono">所在地区</span>、<span class="mono">左/右利手</span>、<span class="mono">左眼近视度数</span>、<span class="mono">右眼近视度数</span>、<span class="mono">民族</span>、<span class="mono">受教育年限</span>、<span class="mono">身高</span>、<span class="mono">体重</span>、<span class="mono">头围</span>、<span class="mono">参与过</span>。</p>
                    <p>示例：<span class="mono">年龄>=18 & 年龄<30 & (左眼近视度数<600|右眼近视度数<600)</span></p>
                    <p>示例：<span class="mono">参与过!=E000001</span> 或 <span class="mono">参与过=眼动</span></p>
          <p>2) 名额分配写法：每行是一组配额；同一行内用 <span class="mono">&</span> 连接多个条件；<span class="mono">条件*人数</span>；使用 <span class="mono">ALL*20</span> 表示不限条件。</p>
          <p>区间写法：<span class="mono">年龄[18,30)</span> 表示 $18\le \text{年龄}<30$；<span class="mono">[</span> 与 <span class="mono">]</span> 表示包含，<span class="mono">(</span> 与 <span class="mono">)</span> 表示不包含。</p>
          <p>示例：<span class="mono">性别=男*10 & =女*10</span></p>
          <p>示例：<span class="mono">年龄[18,30)*20 & >30*0 & [0,18)*0</span></p>
          <p class="hint">注意：入组条件与名额分配需同时满足，条件之间不可冲突。</p>
        </div>
        <button class="primary" id="saveExperimentRules">保存条件设置</button>
      </div>
      <div class="admin-right">
        <form class="form-grid" id="adminEditInfoForm">
          <label>
            实验名称
            <input value="${experiment.name}" disabled />
          </label>
          <label>
            主试联系方式（手机号）
            <input name="contact_phone" id="adminEditContactPhone" value="${experiment.contact_phone || ""}" />
          </label>
          <label>
            实验类型
            <select name="type" id="adminEditType">
              <option value="">请选择</option>
              <option value="行为">行为</option>
              <option value="EEG">EEG</option>
              <option value="MEG">MEG</option>
              <option value="MRI">MRI</option>
              <option value="NIRS">NIRS</option>
              <option value="眼动">眼动</option>
              <option value="TSM">TSM</option>
              <option value="其他">其他</option>
            </select>
          </label>
          <label>
            地点
            <select name="location" id="adminEditLocation">
              <option value="在线">在线</option>
              <option value="604-2">604-2</option>
              <option value="604-3">604-3</option>
              <option value="604-4">604-4</option>
              <option value="604-5">604-5</option>
              <option value="其他">其他</option>
            </select>
          </label>
          <label id="adminEditLocationCustomField" class="hidden">
            自定义地点
            <input name="location_custom" id="adminEditLocationCustom" />
          </label>
          <label id="adminEditLocationLinkField" class="hidden">
            实验链接
            <input name="location_link" id="adminEditLocationLink" value="${experiment.location_link || ""}" />
          </label>
          <label>
            内容简介
            <textarea name="description" rows="3" id="adminEditDescription">${experiment.description || ""}</textarea>
          </label>
          <label>
            特殊说明
            <textarea name="notes" rows="2" id="adminEditNotes">${experiment.notes || ""}</textarea>
          </label>
          <label>
            预计时长（分钟）
            <input name="duration_min" type="number" min="1" id="adminEditDuration" value="${experiment.duration_min || ""}" />
          </label>
          <label id="adminEditSlotRequirementField">
            预约时间段数量
            <input name="schedule_slots_required" id="adminEditSlotRequirement" value="${experiment.schedule_slots_required || "=1"}" />
          </label>
          <label>
            报酬
            <input name="reward" id="adminEditReward" value="${experiment.reward || ""}" />
          </label>
          <button type="button" class="primary" id="saveExperimentInfo">保存实验信息</button>
        </form>
        <button type="button" class="ghost danger hidden" id="deleteExperimentBtn">删除实验</button>
      </div>
    </div>
    <div class="schedule-editor full-width" id="adminEditScheduleEditor">
      <div class="schedule-header">
        <button type="button" class="ghost" id="adminEditSchedulePrev">◀</button>
        <div id="adminEditScheduleTitle"></div>
        <button type="button" class="ghost" id="adminEditScheduleNext">▶</button>
        <button type="button" class="ghost" id="adminEditScheduleUp">▲</button>
        <button type="button" class="ghost" id="adminEditScheduleDown">▼</button>
        <button type="button" class="ghost" id="adminEditScheduleFill">一键填充</button>
        <button type="button" class="ghost" id="adminEditScheduleRefresh">刷新排期</button>
        <button type="button" class="primary" id="adminEditScheduleSave">保存排期</button>
      </div>
      <div class="schedule-grid" id="adminEditScheduleGrid"></div>
    </div>
  `;

  const pauseBtn = panel.querySelector("#pauseExperimentBtn");
  const saveRulesBtn = panel.querySelector("#saveExperimentRules");
  const saveInfoBtn = panel.querySelector("#saveExperimentInfo");
  const deleteBtn = panel.querySelector("#deleteExperimentBtn");
  const editConditions = panel.querySelector("#adminEditConditions");
  const editQuota = panel.querySelector("#adminEditQuota");
  const editScheduleSave = panel.querySelector("#adminEditScheduleSave");
  const editSchedulePrev = panel.querySelector("#adminEditSchedulePrev");
  const editScheduleNext = panel.querySelector("#adminEditScheduleNext");
  const editScheduleUp = panel.querySelector("#adminEditScheduleUp");
  const editScheduleDown = panel.querySelector("#adminEditScheduleDown");
  const editScheduleFill = panel.querySelector("#adminEditScheduleFill");
  const editScheduleRefresh = panel.querySelector("#adminEditScheduleRefresh");
  const editType = panel.querySelector("#adminEditType");
  const editLocation = panel.querySelector("#adminEditLocation");
  const editLocationCustom = panel.querySelector("#adminEditLocationCustom");
  const editLocationCustomField = panel.querySelector("#adminEditLocationCustomField");
  const editLocationLink = panel.querySelector("#adminEditLocationLink");
  const editLocationLinkField = panel.querySelector("#adminEditLocationLinkField");
  const editContactPhone = panel.querySelector("#adminEditContactPhone");
  const editDescription = panel.querySelector("#adminEditDescription");
  const editNotes = panel.querySelector("#adminEditNotes");
  const editDuration = panel.querySelector("#adminEditDuration");
  const editSlotRequirement = panel.querySelector("#adminEditSlotRequirement");
  const editSlotRequirementField = panel.querySelector("#adminEditSlotRequirementField");
  const editReward = panel.querySelector("#adminEditReward");

  if (editType) editType.value = experiment.type || "";

  if (editLocation) {
    const knownLocations = ["在线", "604-2", "604-3", "604-4", "604-5", "其他"];
    if (knownLocations.includes(experiment.location)) {
      editLocation.value = experiment.location;
    } else {
      editLocation.value = "其他";
      if (editLocationCustom) editLocationCustom.value = experiment.location || "";
    }
  }

  const syncEditLocationFields = () => {
    if (!editLocation) return;
    const isOnline = editLocation.value === "在线";
    const isCustom = editLocation.value === "其他";
    editLocationLinkField?.classList.toggle("hidden", !isOnline);
    editLocationCustomField?.classList.toggle("hidden", !isCustom);
  };
  syncEditLocationFields();
  editLocation?.addEventListener("change", syncEditLocationFields);

  if (editSlotRequirementField) {
    editSlotRequirementField.classList.toggle("hidden", experiment.schedule_required !== 1);
  }

  if (deleteBtn) {
    deleteBtn.classList.toggle("hidden", experiment.status !== "paused");
  }
  pauseBtn.addEventListener("click", async () => {
    try {
      pauseBtn.disabled = true;
      pauseBtn.classList.add("loading");
      pauseBtn.textContent = "处理中...";
      state.adminActiveTab = experiment.experiment_uid;
      await apiRequest("/admin/experiment/pause", {
        method: "POST",
        json: { experiment_uid: experiment.experiment_uid, paused: experiment.status !== "paused" },
      });
      await loadAdminExperiments();
      await loadAdminExperimentList();
    } catch (error) {
      setStatus(adminExperimentStatus, error.message, true);
    } finally {
      pauseBtn.disabled = false;
      pauseBtn.classList.remove("loading");
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

  const loadScheduleFromSlots = (sourceSlots) => {
    const allSlots = sourceSlots
      .map(convertSlotToSchedule)
      .filter(Boolean);
    adminScheduleState.slots = allSlots;
    adminScheduleState.selectedIds.clear();
    if (allSlots.length > 0) {
      adminScheduleState.weekStart = startOfWeek(new Date(`${allSlots[0].date}T00:00:00`));
    }
    renderAdminEditScheduleGrid();
  };

  editScheduleRefresh?.addEventListener("click", async () => {
    if (!editScheduleRefresh) return;
    try {
      editScheduleRefresh.disabled = true;
      editScheduleRefresh.classList.add("loading");
      await loadAdminExperimentDetail(experiment.experiment_uid);
    } finally {
      editScheduleRefresh.disabled = false;
      editScheduleRefresh.classList.remove("loading");
    }
  });

  editScheduleUp?.addEventListener("click", () => {
    shiftViewWindow(adminScheduleState, -VIEW_STEP_MIN, renderAdminEditScheduleGrid);
  });

  editScheduleDown?.addEventListener("click", () => {
    shiftViewWindow(adminScheduleState, VIEW_STEP_MIN, renderAdminEditScheduleGrid);
  });

  editScheduleFill?.addEventListener("click", () => {
    const durationMin = Number(adminEditState.experiment?.duration_min || 0);
    if (!durationMin) return;
    const days = buildWeekDates(adminScheduleState.weekStart);
    const date = days[adminScheduleState.activeDayIndex];
    if (isDateBeforeToday(date)) {
      setStatus(adminExperimentStatus, "不能选择今天之前的日期", true);
      return;
    }
    const dayKey = formatLocalDate(date);
    adminScheduleState.slots = adminScheduleState.slots.filter((slot) => slot.date !== dayKey);
    let cursor = 9 * 60;
    while (cursor + durationMin <= 22 * 60) {
      addAdminScheduleSlot({ date, startMin: cursor, endMin: cursor + durationMin, capacity: 1 });
      cursor += durationMin + 20;
    }
    renderAdminEditScheduleGrid();
  });

  loadScheduleFromSlots(slots);

  saveInfoBtn?.addEventListener("click", async () => {
    try {
      const locationValue = editLocation?.value === "其他" ? editLocationCustom?.value : editLocation?.value;
      if (!locationValue) {
        setStatus(adminExperimentStatus, "请填写实验地点", true);
        return;
      }
      await apiRequest("/admin/experiment/update", {
        method: "POST",
        json: {
          experiment_uid: experiment.experiment_uid,
          contact_phone: editContactPhone?.value || null,
          type: editType?.value || null,
          location: locationValue,
          location_link: editLocationLink?.value || null,
          description: editDescription?.value || null,
          notes: editNotes?.value || null,
          duration_min: editDuration?.value || null,
          schedule_slots_required: editSlotRequirement?.value || "=1",
          reward: editReward?.value || null,
        },
      });
      setStatus(adminExperimentStatus, "实验信息已保存");
      await loadAdminExperiments();
      await loadAdminExperimentList();
      await loadAdminExperimentDetail(experiment.experiment_uid);
    } catch (error) {
      setStatus(adminExperimentStatus, error.message, true);
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    try {
      await apiRequest("/admin/experiment/delete", {
        method: "POST",
        json: { experiment_uid: experiment.experiment_uid },
      });
      state.adminActiveTab = "new";
      await loadAdminExperiments();
      await loadAdminExperimentList();
      selectAdminTab("new");
    } catch (error) {
      setStatus(adminExperimentStatus, error.message, true);
    }
  });

  editSchedulePrev?.addEventListener("click", () => {
    const todayStart = startOfWeek(new Date());
    const next = new Date(adminScheduleState.weekStart);
    next.setDate(next.getDate() - 7);
    if (next < todayStart) return;
    adminScheduleState.weekStart = next;
    renderAdminEditScheduleGrid();
  });

  editScheduleNext?.addEventListener("click", () => {
    const next = new Date(adminScheduleState.weekStart);
    next.setDate(next.getDate() + 7);
    adminScheduleState.weekStart = next;
    renderAdminEditScheduleGrid();
  });

  editScheduleSave.addEventListener("click", async () => {
    if (!editScheduleSave) return;
    try {
      editScheduleSave.disabled = true;
      editScheduleSave.classList.add("loading");
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
    } finally {
      editScheduleSave.disabled = false;
      editScheduleSave.classList.remove("loading");
    }
  });

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
      const startText = participant.slot?.start_time ? formatSlotDateTime(participant.slot.start_time) : "-";
      item.innerHTML = `
        <span>${participant.name} (${participant.user_uid}) · ${startText}</span>
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
    setSelectedExperiment(exp, null);
    return;
  }
  setSelectedExperiment(exp, null);
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
  const sortedSlots = [...slots].sort((a, b) => Date.parse(a.start_time || "") - Date.parse(b.start_time || ""));
  state.experimentSlots[exp.experiment_uid] = sortedSlots;
  slotWrap.innerHTML = `<p class="hint">请选择可预约时间段</p>`;
  if (!sortedSlots.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "暂无可预约时间段";
    slotWrap.appendChild(empty);
    if (state.selectedExperimentUid === exp.experiment_uid) {
      state.selectedSlotIds.clear();
    }
    setStatus(experimentStatus, "暂无可预约时间段", true);
  } else {
    sortedSlots.forEach((slot) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost experiment-slot-btn";
      if (state.selectedExperimentUid === exp.experiment_uid && state.selectedSlotIds.has(String(slot.id))) {
        btn.classList.add("selected");
      }
      btn.textContent = `${formatSlotDateTime(slot.start_time)} - ${formatSlotTime(slot.end_time)}`;
      btn.addEventListener("click", () => {
        toggleScheduleSlotSelection(exp, slot, slots);
      });
      slotWrap.appendChild(btn);
    });
  }
  container.appendChild(slotWrap);
}

function formatSlotTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatSlotDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d} ${formatSlotTime(value)}`;
}

async function applyExperiment(exp, selectedSlots) {
  setStatus(experimentStatus, "提交中...");
  try {
    const slotIds = Array.isArray(selectedSlots)
      ? selectedSlots.map((slot) => slot.id)
      : (selectedSlots?.id ? [selectedSlots.id] : []);
    const payload = {
      experiment_uid: exp.experiment_uid,
      slot_ids: slotIds.length ? slotIds : undefined,
      slot_id: slotIds.length === 1 ? slotIds[0] : undefined,
    };
    const data = await apiRequest("/experiments/apply", { method: "POST", json: payload });
    if (data.location === "在线" && data.location_link) {
      setStatus(experimentStatus, "报名成功，正在跳转实验链接...");
      window.open(data.location_link, "_blank");
    } else {
      const contact = data.contact_phone ? `主试联系方式：${data.contact_phone}` : "请联系主试确认信息";
      setStatus(experimentStatus, `报名成功，${contact}`);
    }
    clearExperimentSelection();
    renderExperiments();
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


locationSelect?.addEventListener("change", () => {
  const isOnline = locationSelect.value === "在线";
  locationLinkField?.classList.toggle("hidden", !isOnline);
  const isCustom = locationSelect.value === "其他";
  locationCustomField?.classList.toggle("hidden", !isCustom);
});

scheduleRequired?.addEventListener("change", () => {
  scheduleEditor?.classList.toggle("hidden", scheduleRequired.value !== "yes");
  scheduleSlotsRequiredField?.classList.toggle("hidden", scheduleRequired.value !== "yes");
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

scheduleUp?.addEventListener("click", () => {
  shiftViewWindow(scheduleState, -VIEW_STEP_MIN, renderScheduleGrid);
});

scheduleDown?.addEventListener("click", () => {
  shiftViewWindow(scheduleState, VIEW_STEP_MIN, renderScheduleGrid);
});

scheduleFill?.addEventListener("click", () => {
  const durationMin = Number(adminExperimentForm?.elements?.namedItem?.("duration_min")?.value || 0);
  if (!durationMin) {
    setStatus(adminExperimentStatus, "请先填写预计时长", true);
    return;
  }
  const days = buildWeekDates(scheduleState.weekStart);
  const date = days[scheduleState.activeDayIndex];
  if (isDateBeforeToday(date)) {
    setStatus(adminExperimentStatus, "不能选择今天之前的日期", true);
    return;
  }
  const dayKey = formatLocalDate(date);
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
  const submitBtn = profileForm.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
  }
  setStatus(profileStatus, "保存中...");
  try {
    const updates = toJsonForm(profileForm);
    await apiRequest("/profile/update", { method: "POST", json: { updates } });
    setStatus(profileStatus, "已保存");
    await loadProfile();
  } catch (error) {
    setStatus(profileStatus, error.message, true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
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
      await apiRequest("/password/update", {
        method: "POST",
        json: {
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

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitBtn = contactForm.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
  }
  setStatus(contactStatus, "保存中...");
  try {
    const updates = toJsonForm(contactForm);
    await apiRequest("/profile/update", { method: "POST", json: { updates } });
    setStatus(contactStatus, "已保存");
    await loadProfile();
  } catch (error) {
    setStatus(contactStatus, error.message, true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
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
      contact_phone: payload.contact_phone,
      name: payload.name,
      type: payload.type,
      location,
      location_link: payload.location_link,
      description: payload.description,
      notes: payload.notes,
      duration_min: payload.duration_min,
      reward: payload.reward,
      schedule_required: scheduleRequiredValue,
      schedule_slots_required: scheduleRequiredValue ? payload.schedule_slots_required || "=1" : "=1",
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
  const submitBtn = experimentForm.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
  }
  if (!state.selectedExperimentUid) {
    setStatus(experimentStatus, "请先选中实验", true);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
    return;
  }
  const exp = state.experiments.find((item) => item.experiment_uid === state.selectedExperimentUid);
  if (!exp) {
    setStatus(experimentStatus, "未找到选中的实验", true);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
    return;
  }
  if (exp.schedule_required) {
    const requirement = parseSlotRequirement(exp.schedule_slots_required || "=1");
    const count = state.selectedSlotIds.size;
    const meets =
      (requirement.operator === "=" && count === requirement.count) ||
      (requirement.operator === ">" && count > requirement.count) ||
      (requirement.operator === ">=" && count >= requirement.count) ||
      (requirement.operator === "<" && count < requirement.count) ||
      (requirement.operator === "<=" && count <= requirement.count);
    if (!meets) {
      setStatus(experimentStatus, `请选择符合数量要求的时间段（${requirement.raw}）`, true);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("loading");
      }
      return;
    }
  }

  const slots = state.experimentSlots[exp.experiment_uid] || [];
  const slotIds = exp.schedule_required
    ? Array.from(state.selectedSlotIds)
    : [];
  const selectedSlots = slots.filter((item) => slotIds.includes(String(item.id)));
  try {
    await applyExperiment(exp, exp.schedule_required ? selectedSlots : null);
  } finally {
    await loadExperiments();
    if (exp.schedule_required) {
      await showExperimentDetail(exp);
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
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
scheduleSlotsRequiredField?.classList.toggle("hidden", scheduleRequired?.value !== "yes");
locationSelect?.dispatchEvent(new Event("change"));
