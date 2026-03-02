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
  majors: [],
  selectedMajors: [],
};

const adminEditState = {
  experiment: null,
  slots: [],
  participants: {},
};

const uploadState = {
  prefix: null,
  files: [],
  totalBytes: 0,
  uploadedBytes: 0,
  pathOptions: { stripTopLevel: false },
  hasIndex: false,
  uploading: false,
  ready: false,
  mode: "link",
  source: null,
};

// NOTE: Keep these snippets free of `${...}` to avoid host template interpolation at runtime.
const TOKEN_SCRIPT_MASK = `<script>
(function () {
  const ACCESS_BASE = "https://exp.vaonline.dpdns.org";
  const VERIFY_ENDPOINT = ACCESS_BASE + "/token/verify";
  const token = new URLSearchParams(location.search).get("access_token");

  const mask = document.createElement("div");
  mask.style.position = "fixed";
  mask.style.inset = "0";
  mask.style.background = "#f6f7fb";
  mask.style.color = "#1f2937";
  mask.style.display = "flex";
  mask.style.alignItems = "center";
  mask.style.justifyContent = "center";
  mask.style.zIndex = "999999";
  mask.style.fontFamily = "Noto Sans SC, sans-serif";
  mask.innerHTML = "<div style=\"text-align:center;max-width:420px;padding:24px\"><h2>正在验证实验访问</h2><p id=\"accessMsg\" style=\"color:#6b7280\">请稍候...</p></div>";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(mask));

  async function verify() {
    if (!token) {
      update("未检测到访问令牌，请从预约入口进入实验。", true);
      return false;
    }
    try {
      const resp = await fetch(VERIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        update(data.error || "访问令牌无效", true);
        return false;
      }
      update("验证通过，正在进入实验...", false);
      return true;
    } catch {
      update("验证失败，请检查网络后重试。", true);
      return false;
    }
  }

  function update(text, isError) {
    const msg = document.getElementById("accessMsg");
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = isError ? "#b42318" : "#2563eb";
  }

  window.addEventListener("load", async () => {
    const ok = await verify();
    if (ok) {
      setTimeout(() => mask.remove(), 200);
    }
  });
})();
</script>`;

const TOKEN_SCRIPT_BLOCK = `<script>
(function () {
  const ACCESS_BASE = "https://exp.vaonline.dpdns.org";
  const VERIFY_ENDPOINT = ACCESS_BASE + "/token/verify";
  const token = new URLSearchParams(location.search).get("access_token");
  document.documentElement.style.visibility = "hidden";

  function showError(message) {
    document.documentElement.innerHTML = "";
    document.body.style.margin = "0";
    document.body.style.fontFamily = "Noto Sans SC, sans-serif";
    document.body.innerHTML = "<div style=\"min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f7fb;color:#1f2937\"><div style=\"max-width:420px;padding:24px;text-align:center\"><h2>无法进入实验</h2><p style=\"color:#b42318\">" + message + "</p></div></div>";
    document.documentElement.style.visibility = "visible";
  }

  async function verify() {
    if (!token) {
      showError("未检测到访问令牌，请从预约入口进入实验。");
      return;
    }
    try {
      const resp = await fetch(VERIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        showError(data.error || "访问令牌无效");
        return;
      }
      document.documentElement.style.visibility = "visible";
    } catch {
      showError("验证失败，请检查网络后重试。");
    }
  }

  verify();
})();
</script>`;

function resetUploadState() {
  uploadState.prefix = null;
  uploadState.files = [];
  uploadState.totalBytes = 0;
  uploadState.uploadedBytes = 0;
  uploadState.pathOptions = { stripTopLevel: false };
  uploadState.hasIndex = false;
  uploadState.uploading = false;
  uploadState.ready = false;
  uploadState.source = null;
  if (uploadZoneMeta) uploadZoneMeta.textContent = "需包含 index.html";
  setUploadStatusText("");
}

function setUploadStatusText(text, isError = false) {
  if (!uploadStatus) return;
  uploadStatus.textContent = text;
  uploadStatus.style.color = isError ? "#b42318" : "";
}

function bindCopyButtons(root) {
  if (!root) return;
  root.querySelectorAll("[data-copy-script]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const type = btn.dataset.copyScript;
      const code = type === "block" ? TOKEN_SCRIPT_BLOCK : TOKEN_SCRIPT_MASK;
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = "已复制";
        setTimeout(() => {
          btn.textContent = "复制脚本";
        }, 1600);
      } catch {
        alert("复制失败，请手动复制。");
      }
    });
  });
}

function initTokenScriptHelp() {
  bindCopyButtons(document);
}

function setUploadMode(mode) {
  const isOnline = locationSelect?.value === "在线";
  uploadTabs?.classList.toggle("hidden", !isOnline);
  if (!isOnline) {
    uploadPanelLink?.classList.add("hidden");
    uploadPanelUpload?.classList.add("hidden");
    uploadPanelGithub?.classList.add("hidden");
    downloadPolicyField?.classList.add("hidden");
    return;
  }
  uploadState.mode = ["link", "upload", "github"].includes(mode) ? mode : "link";
  uploadTabs?.querySelectorAll(".mini-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.uploadTab === uploadState.mode);
  });
  uploadPanelLink?.classList.toggle("hidden", uploadState.mode !== "link");
  uploadPanelUpload?.classList.toggle("hidden", uploadState.mode !== "upload");
  uploadPanelGithub?.classList.toggle("hidden", uploadState.mode !== "github");
  downloadPolicyField?.classList.toggle("hidden", !(uploadState.mode === "upload" || uploadState.mode === "github"));
  setHostedLinkMode(uploadState.mode === "upload" || uploadState.mode === "github");
  applyAccessModeRules(uploadState.mode === "upload" || uploadState.mode === "github");
  updateTokenScriptHelp();
  syncAdminHelpCardHeight();
}

function updateTokenScriptHelp() {
  if (!tokenScriptHelp) return;
  const show = locationSelect?.value === "在线"
    && uploadState.mode === "link"
    && accessControlMode?.value === "token";
  tokenScriptHelp.classList.toggle("hidden", !show);
}

function applyAccessModeRules(isUploadMode) {
  if (!accessControlMode) return;
  const proxyOption = Array.from(accessControlMode.options || []).find((opt) => opt.value === "proxy");
  if (proxyOption) {
    proxyOption.disabled = isUploadMode;
    if (isUploadMode && accessControlMode.value === "proxy") {
      accessControlMode.value = "token";
    }
  }
  const tokenOption = Array.from(accessControlMode.options || []).find((opt) => opt.value === "token");
  if (tokenOption) {
    tokenOption.dataset.hint = isUploadMode
      ? "拼接令牌：系统自动注入验证与一次性访问控制。"
      : "拼接令牌：需要在实验页面 head 添加脚本校验 token。";
  }
  updateAccessControlHint(accessControlMode, accessControlHint);
}

async function getFilesFromDrop(event) {
  const items = event.dataTransfer?.items;
  if (!items || items.length === 0) return Array.from(event.dataTransfer?.files || []);
  const entries = Array.from(items)
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter(Boolean);
  if (!entries.length) return Array.from(event.dataTransfer?.files || []);
  const collected = [];
  const walkEntry = (entry, basePath = "") => new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        Object.defineProperty(file, "webkitRelativePath", {
          value: `${basePath}${file.name}`,
        });
        collected.push(file);
        resolve();
      });
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      const readEntries = () => {
        reader.readEntries(async (entriesBatch) => {
          if (!entriesBatch.length) {
            resolve();
            return;
          }
          for (const child of entriesBatch) {
            await walkEntry(child, `${basePath}${entry.name}/`);
          }
          readEntries();
        });
      };
      readEntries();
      return;
    }
    resolve();
  });
  for (const entry of entries) {
    await walkEntry(entry, "");
  }
  return collected;
}

function normalizeUploadPath(file, options = {}) {
  const raw = file?.webkitRelativePath || file?.name || "";
  const parts = raw.split("/").filter(Boolean);
  if (options.stripTopLevel && parts.length > 1) parts.shift();
  return parts.join("/");
}

function buildUploadPathOptions(files) {
  const rawPaths = (files || [])
    .map((file) => String(file?.webkitRelativePath || file?.name || ""))
    .filter(Boolean);
  if (!rawPaths.length) return { stripTopLevel: false };
  const segments = rawPaths.map((path) => path.split("/").filter(Boolean));
  if (segments.some((parts) => parts.length <= 1)) {
    return { stripTopLevel: false };
  }
  const topLevel = segments[0][0];
  const shareSameTopLevel = segments.every((parts) => parts[0] === topLevel);
  return { stripTopLevel: shareSameTopLevel };
}

function describeUploadSelection(files) {
  const pathOptions = buildUploadPathOptions(files);
  const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);
  const hasIndex = files.some((file) => {
    const path = normalizeUploadPath(file, pathOptions).toLowerCase();
    return path === "index.html" || path.endsWith("/index.html");
  });
  const mb = (totalBytes / (1024 * 1024)).toFixed(1);
  return { totalBytes, hasIndex, mb, pathOptions };
}

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

const DEFAULT_MAJORS = [
  "无",
  "哲学类",
  "经济学类",
  "财政学类",
  "金融学类",
  "经济与贸易类",
  "法学类",
  "政治学类",
  "社会学类",
  "民族学类",
  "马克思主义理论类",
  "公安学类",
  "教育学类",
  "体育学类",
  "中国语言文学类",
  "外国语言文学类",
  "新闻传播学类",
  "历史学类",
  "数学类",
  "物理学类",
  "化学类",
  "天文学类",
  "地理科学类",
  "大气科学类",
  "海洋科学类",
  "地球物理学类",
  "地质学类",
  "生物科学类",
  "心理学类",
  "统计学类",
  "力学类",
  "机械类",
  "仪器类",
  "材料类",
  "能源动力类",
  "电气类",
  "电子信息类",
  "自动化类",
  "计算机类",
  "土木类",
  "水利类",
  "测绘类",
  "化工与制药类",
  "地质类",
  "矿业类",
  "纺织类",
  "轻工类",
  "交通运输类",
  "海洋工程类",
  "航空航天类",
  "兵器类",
  "核工程类",
  "农业工程类",
  "林业工程类",
  "环境科学与工程类",
  "生物医学工程类",
  "食品科学与工程类",
  "建筑类",
  "安全科学与工程类",
  "生物工程类",
  "公安技术类",
  "交叉工程类",
  "植物生产类",
  "自然保护与环境生态类",
  "动物生产类",
  "动物医学类",
  "林学类",
  "水产类",
  "草学类",
  "基础医学类",
  "临床医学类",
  "口腔医学类",
  "公共卫生与预防医学类",
  "中医学类",
  "中西医结合类",
  "药学类",
  "中药学类",
  "法医学类",
  "医学技术类",
  "护理学类",
  "管理科学与工程类",
  "工商管理类",
  "农业经济管理类",
  "公共管理类",
  "图书情报与档案管理类",
  "物流管理与工程类",
  "工业工程类",
  "电子商务类",
  "旅游管理类",
  "艺术学理论类",
  "音乐与舞蹈学类",
  "戏剧与影视学类",
  "美术学类",
  "设计学类",
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
const appliedExperimentList = document.getElementById("appliedExperimentList");

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
const majorInput = document.getElementById("majorInput");
const majorSuggestions = document.getElementById("majorSuggestions");
const majorTags = document.getElementById("majorTags");
const majorHidden = document.getElementById("majorHidden");

const changePasswordBtn = document.getElementById("changePasswordBtn");
const rootGrantToggleBtn = document.getElementById("rootGrantToggleBtn");
const passwordPanel = document.getElementById("passwordPanel");
const passwordPanelClose = document.getElementById("passwordPanelClose");
const passwordForm = document.getElementById("passwordForm");
const passwordStatus = document.getElementById("passwordStatus");
const rootPasswordSection = document.getElementById("rootPasswordSection");
const rootGrantPanelClose = document.getElementById("rootGrantPanelClose");
const contactPanel = document.getElementById("contactPanel");
const contactForm = document.getElementById("contactForm");
const contactStatus = document.getElementById("contactStatus");

const adminArea = document.getElementById("adminArea");
const adminTabCopyHint = document.getElementById("adminTabCopyHint");
const adminTabs = document.getElementById("adminTabs");
const adminPanelNew = document.getElementById("adminPanelNew");
const adminExperimentForm = document.getElementById("adminExperimentForm");
const adminExperimentStatus = document.getElementById("adminExperimentStatus");
const adminContactPhone = document.getElementById("adminContactPhone");
const rootGrantPanel = document.getElementById("rootGrantPanel");
const rootGrantForm = document.getElementById("rootGrantForm");
const rootGrantStatus = document.getElementById("rootGrantStatus");
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
const uploadTabs = document.getElementById("uploadTabs");
const uploadPanelLink = document.getElementById("uploadPanelLink");
const uploadPanelUpload = document.getElementById("uploadPanelUpload");
const uploadPanelGithub = document.getElementById("uploadPanelGithub");
const hostedUploadField = document.getElementById("hostedUploadField");
const uploadZone = document.getElementById("uploadZone");
const uploadFolderInput = document.getElementById("uploadFolderInput");
const uploadZoneMeta = document.getElementById("uploadZoneMeta");
const uploadStatus = document.getElementById("uploadStatus");
const githubRepoInput = document.getElementById("githubRepoInput");
const downloadPolicyField = document.getElementById("downloadPolicyField");
const downloadPolicy = document.getElementById("downloadPolicy");
const accessControlModeField = document.getElementById("accessControlModeField");
const accessControlMode = document.getElementById("accessControlMode");
const accessControlHint = document.getElementById("accessControlHint");
const allowedDevicesField = document.getElementById("allowedDevicesField");
const sameDeviceSingleAccount = document.getElementById("sameDeviceSingleAccount");
const tokenScriptHelp = document.getElementById("tokenScriptHelp");
const tokenScriptMask = null;
const tokenScriptBlock = null;

const adminExperimentsSection = document.getElementById("adminExperiments");
const adminExperimentList = document.getElementById("adminExperimentList");
const adminExperimentsRefresh = document.getElementById("adminExperimentsRefresh");

const VIEW_START_DEFAULT = 9 * 60;
const VIEW_END_DEFAULT = 18 * 60;
const VIEW_STEP_MIN = 180;
const IS_COARSE_POINTER = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

function setStatus(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? "#b42318" : "";
}

function setLoadingBlock(container, text = "加载中...") {
  if (!container) return;
  container.innerHTML = `
    <div class="loading-block" role="status" aria-live="polite">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>${text}</span>
    </div>
  `;
}

function setAdminTabsLoading(text = "正在加载实验列表...") {
  if (!adminTabs) return;
  adminTabs.innerHTML = `
    <button class="tab active" type="button" disabled>
      <span class="loading-inline"><span class="loading-spinner small" aria-hidden="true"></span>${text}</span>
    </button>
  `;
}

function toJsonForm(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getCheckedValues(form, name) {
  if (!form) return [];
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`))
    .map((input) => input.value);
}

function getOrCreateDeviceFingerprint() {
  const parts = [
    navigator.platform || "",
    `${screen.width || 0}x${screen.height || 0}`,
    String(window.devicePixelRatio || 1),
    String(navigator.hardwareConcurrency || ""),
    String(navigator.deviceMemory || ""),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    String(navigator.maxTouchPoints || 0),
  ];
  return parts.join("|");
}

function hasAdminDraftContent() {
  if (!adminExperimentForm) return false;
  const name = adminExperimentForm.querySelector("input[name='name']")?.value?.trim();
  const desc = adminExperimentForm.querySelector("textarea[name='description']")?.value?.trim();
  const notes = adminExperimentForm.querySelector("textarea[name='notes']")?.value?.trim();
  const githubRepo = adminExperimentForm.querySelector("input[name='github_repo']")?.value?.trim();
  const quota = adminQuota?.value?.trim();
  const cond = adminConditions?.value?.trim();
  return Boolean(name || desc || notes || githubRepo || (quota && quota !== "性别=男*10 & =女*10\n年龄[18,30)*20 & >30*0 & [0,18)*0\n左/右利手=右*20") || (cond && cond !== "年龄>=18\n左/右利手=右") || scheduleState.slots.length || uploadState.files.length);
}

function refreshAdminTabCopyHint() {
  if (!adminTabCopyHint) return;
  adminTabCopyHint.textContent = IS_COARSE_POINTER
    ? "提示：长按任一实验标签，可复制该实验配置到“新实验”（不复制排期）"
    : "提示：右键任一实验标签，可复制该实验配置到“新实验”（不复制排期）";
}

function filterUploadFiles(inputFiles) {
  const files = Array.from(inputFiles || []);
  const pathOptions = buildUploadPathOptions(files);
  return files.filter((file) => {
    const path = normalizeUploadPath(file, pathOptions).toLowerCase();
    if (!path) return false;
    return !(path === ".git" || path.startsWith(".git/") || path.includes("/.git/"));
  });
}

function copyExperimentToNewDraft(experiment) {
  if (!adminExperimentForm || !experiment) return;
  if (state.adminActiveTab !== "new" && hasAdminDraftContent()) {
    const ok = window.confirm("新实验草稿将被复制内容覆盖（排期不会复制）。是否继续？");
    if (!ok) return;
  }

  state.adminActiveTab = "new";
  renderAdminTabs();

  const setValue = (selector, value) => {
    const el = adminExperimentForm.querySelector(selector);
    if (el) el.value = value ?? "";
  };

  setValue("input[name='contact_phone']", experiment.contact_phone || "");
  setValue("input[name='name']", `${experiment.name || ""}-复制`);
  setValue("select[name='type']", experiment.type || "");
  setValue("textarea[name='description']", experiment.description || "");
  setValue("textarea[name='notes']", experiment.notes || "");
  setValue("input[name='duration_min']", experiment.duration_min || "");
  setValue("input[name='reward']", experiment.reward || "");
  setValue("input[name='schedule_slots_required']", experiment.schedule_slots_required || "=1");

  const location = experiment.location || "在线";
  const accessConfig = safeJsonParse(experiment.access_control_config_json, null) || {};
  const sourceType = accessConfig?.source === "github"
    ? "github"
    : (accessConfig?.hosted ? "upload" : "link");
  const locationSelectEl = adminExperimentForm.querySelector("select[name='location']");
  const knownLocations = ["在线", "604-2", "604-3", "604-4", "604-5", "其他"];
  if (locationSelectEl) {
    locationSelectEl.value = knownLocations.includes(location) ? location : "其他";
    locationSelectEl.dispatchEvent(new Event("change"));
  }
  if (!knownLocations.includes(location)) {
    setValue("input[name='location_custom']", location);
  }
  setValue("input[name='location_link']", sourceType === "link" ? (experiment.location_link || "") : "");
  setValue("input[name='github_repo']", accessConfig?.github_repo || "");

  const accessModeEl = adminExperimentForm.querySelector("select[name='access_control_mode']");
  if (accessModeEl) {
    accessModeEl.value = experiment.access_control_mode || "none";
    accessModeEl.dispatchEvent(new Event("change"));
  }

  const allowedSet = new Set(safeJsonParse(experiment.allowed_devices_json, ["desktop", "tablet", "mobile"]));
  adminExperimentForm.querySelectorAll("input[name='allowed_devices']").forEach((input) => {
    input.checked = allowedSet.has(input.value);
  });

  if (sameDeviceSingleAccount) {
    sameDeviceSingleAccount.checked = Number(experiment.same_device_single_account ?? 1) !== 0;
  }

  if (downloadPolicy) {
    const copiedPolicy = accessConfig?.download_policy || "upload_only";
    const validPolicy = ["download_and_upload", "upload_only", "download_only"].includes(copiedPolicy)
      ? copiedPolicy
      : "upload_only";
    downloadPolicy.value = validPolicy;
  }

  if (scheduleRequired) {
    scheduleRequired.value = Number(experiment.schedule_required) === 1 ? "yes" : "no";
    scheduleRequired.dispatchEvent(new Event("change"));
  }

  if (adminConditions) adminConditions.value = experiment.conditions_text || "";
  if (adminQuota) adminQuota.value = experiment.quotas_text || "";

  // 明确不复制排期；在线资源模式会复制引用配置
  scheduleState.slots = [];
  renderScheduleGrid();
  if (sourceType === "upload") {
    resetUploadState();
    uploadState.prefix = accessConfig?.asset_prefix || null;
    uploadState.ready = Boolean(uploadState.prefix);
    uploadState.hasIndex = Boolean(uploadState.prefix);
    uploadState.source = "hosted";
    setUploadMode("upload");
    setUploadStatusText(uploadState.prefix
      ? "已复制在线实验文件配置（可重新上传覆盖）"
      : "原实验上传前缀缺失，请重新上传实验文件夹", !uploadState.prefix);
  } else if (sourceType === "github") {
    resetUploadState();
    uploadState.prefix = accessConfig?.asset_prefix || null;
    uploadState.source = "github";
    setUploadMode("github");
    setUploadStatusText("已复制 GitHub 仓库配置");
  } else {
    resetUploadState();
    setUploadMode("link");
  }
  setStatus(adminExperimentStatus, `已复制「${experiment.name}」配置到新实验`);
}

function updateAccessControlHint(selectEl, hintEl) {
  if (!selectEl || !hintEl) return;
  const option = selectEl.options[selectEl.selectedIndex];
  const hint = option?.dataset?.hint || "";
  hintEl.textContent = hint;
  selectEl.title = hint;
}

function normalizeRequestError(error, path = "") {
  const raw = String(error?.message || error || "请求失败").trim();
  const lower = raw.toLowerCase();
  const networkLike =
    lower.includes("failed to fetch")
    || lower.includes("err_name_not_resolved")
    || lower.includes("networkerror")
    || lower.includes("load failed")
    || lower.includes("network request failed");

  if (networkLike) {
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (isOffline) {
      return "网络连接已断开，请检查网络后重试。";
    }
    if (path.includes("/admin/experiment/create")) {
      return "发布实验时网络或域名解析暂时异常，请稍后重试（通常几秒到几十秒可恢复）。";
    }
    return "网络或域名解析暂时异常，请稍后重试。";
  }
  return raw || "请求失败";
}

async function apiRequest(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.json) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.json ? JSON.stringify(options.json) : options.body,
    });
  } catch (error) {
    throw new Error(normalizeRequestError(error, path));
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    let message = data?.error || data?.detail || data || "请求失败";
    if (data?.error === "Server error" && data?.detail) {
      message = data.detail;
    }
    throw new Error(normalizeRequestError(new Error(message), path));
  }
  return data;
}

async function downloadApiFile(path, fallbackName = "download.tar") {
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE}${path}`, { method: "GET", headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "下载失败");
    throw new Error(text || "下载失败");
  }
  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const matched = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^\";]+)"?/i);
  const fileName = decodeURIComponent(matched?.[1] || matched?.[2] || fallbackName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function initHostedUpload() {
  const result = await apiRequest("/admin/experiment/upload/init", { method: "POST" });
  uploadState.prefix = result.prefix;
}

async function clearHostedPrefix(prefix) {
  await apiRequest("/admin/experiment/upload/clear", {
    method: "POST",
    json: { prefix },
  });
}

async function getHostedUploadSummary(prefix) {
  return apiRequest(`/admin/experiment/upload/list?prefix=${encodeURIComponent(prefix)}`, {
    method: "GET",
  });
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function replaceHostedUpload(prefix, files, statusEl) {
  if (!prefix) throw new Error("上传前缀缺失");
  const filtered = filterUploadFiles(files);
  if (!filtered.length) throw new Error("未检测到可上传文件（.git 已自动忽略）");
  const { totalBytes, hasIndex, pathOptions } = describeUploadSelection(filtered);
  uploadState.pathOptions = pathOptions;
  if (!hasIndex) throw new Error("缺少 index.html，请检查文件夹");
  if (totalBytes > 100 * 1024 * 1024) throw new Error("文件夹总大小超过 100MB");

  if (statusEl) statusEl.textContent = "正在清理旧文件...";
  await clearHostedPrefix(prefix);
  if (statusEl) statusEl.textContent = `准备上传 ${filtered.length} 个文件...`;

  let uploadedBytes = 0;
  for (let index = 0; index < filtered.length; index += 1) {
    const file = filtered[index];
    await uploadHostedFile(prefix, file);
    uploadedBytes += file.size || 0;
    const percent = totalBytes
      ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100))
      : 0;
    if (statusEl) statusEl.textContent = `已上传 ${index + 1}/${filtered.length}，${percent}%`;
  }
  if (statusEl) statusEl.textContent = "覆盖上传完成";
}

async function uploadHostedFile(prefix, file) {
  const path = normalizeUploadPath(file, uploadState.pathOptions || { stripTopLevel: false });
  if (!path) return;
  await apiRequest("/admin/experiment/upload/file", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Prefix": prefix,
      "X-Path": path,
    },
    body: file,
  });
}

async function startHostedUpload(files) {
  if (!files.length) return;
  uploadState.uploading = true;
  uploadState.ready = false;
  if (!uploadState.prefix) {
    setUploadStatusText("正在初始化上传...");
    await initHostedUpload();
  } else {
    setUploadStatusText("正在覆盖上传（清理旧文件）...");
    await clearHostedPrefix(uploadState.prefix);
  }
  setUploadStatusText(`准备上传 ${files.length} 个文件...`);
  uploadState.uploadedBytes = 0;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    await uploadHostedFile(uploadState.prefix, file);
    uploadState.uploadedBytes += file.size || 0;
    const percent = uploadState.totalBytes
      ? Math.min(100, Math.round((uploadState.uploadedBytes / uploadState.totalBytes) * 100))
      : 0;
    setUploadStatusText(`已上传 ${index + 1}/${files.length}，${percent}%`);
  }
  uploadState.uploading = false;
  uploadState.ready = true;
  uploadState.source = "hosted";
  setUploadStatusText("上传完成，可以发布实验。 ");
}

function setHostedLinkMode(isHosted) {
  const linkInput = locationLinkField?.querySelector("input");
  if (!linkInput) return;
  if (isHosted) {
    linkInput.placeholder = "由系统生成";
    linkInput.disabled = true;
  } else {
    linkInput.disabled = false;
    linkInput.placeholder = "";
  }
}

async function handleUploadSelection(fileList) {
  const files = filterUploadFiles(fileList);
  const existingPrefix = uploadState.prefix;
  const keepPrefix = uploadState.mode === "upload" && !!existingPrefix;
  resetUploadState();
  if (keepPrefix) uploadState.prefix = existingPrefix;
  setHostedLinkMode(false);
  if (!files.length) {
    setUploadStatusText("未检测到可上传文件（.git 目录已自动忽略）", true);
    return;
  }
  if (locationSelect?.value !== "在线") {
    setUploadStatusText("仅在线实验可上传", true);
    return;
  }
  setUploadMode("upload");
  const { totalBytes, hasIndex, mb, pathOptions } = describeUploadSelection(files);
  uploadState.files = files;
  uploadState.totalBytes = totalBytes;
  uploadState.pathOptions = pathOptions;
  uploadState.hasIndex = hasIndex;
  if (uploadZoneMeta) {
    uploadZoneMeta.textContent = `已选择 ${files.length} 个文件，约 ${mb} MB${hasIndex ? "" : "（缺少 index.html）"}`;
  }
  if (!hasIndex) {
    setUploadStatusText("缺少 index.html，请检查文件夹", true);
    return;
  }
  if (totalBytes > 100 * 1024 * 1024) {
    setUploadStatusText("文件夹总大小超过 100MB", true);
    return;
  }
  setHostedLinkMode(true);
  await startHostedUpload(files);
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
  const isRoot = state.role === "root";
  document.body.classList.toggle("is-admin", isAdmin);
  profilePane?.classList.toggle("hidden", isAdmin);
  experimentForm?.classList.toggle("hidden", isAdmin);
  profileSplit?.classList.toggle("hidden", isAdmin);
  profileToggle?.classList.toggle("hidden", isAdmin);
  adminArea?.classList.toggle("hidden", !isAdmin);
  adminExperimentsSection?.classList.toggle("hidden", !isAdmin);
  consentSection?.classList.toggle("hidden", isAdmin);
  rootGrantToggleBtn?.classList.toggle("hidden", !isRoot);
  rootPasswordSection?.classList.toggle("hidden", !isRoot);
  contactPanel?.classList.toggle("hidden", !isAdmin);
  if (!isRoot && rootPasswordSection) {
    rootPasswordSection.querySelectorAll("input").forEach((input) => {
      input.value = "";
    });
  }
  if (!isRoot) {
    rootGrantPanel?.classList.add("hidden");
    rootGrantForm?.reset();
  }
  syncAdminHelpCardHeight();
}

function populateProfileForm(profile) {
  if (!profile) return;
  const mapping = {
    alipay_phone: profile.alipay_phone,
    unit: profile.unit,
    occupation: profile.occupation,
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

  setSelectedMajors(Array.isArray(profile.majors) ? profile.majors : []);

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
    if (appliedExperimentList) {
      appliedExperimentList.innerHTML = "";
    }
    setSelectedMajors([]);
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
  dayCount: 7,
  autoStart: true,
  layoutRetry: false,
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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeStartDate(date, dayCount) {
  return dayCount < 7 ? startOfDay(date) : startOfWeek(date);
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

function buildWeekDates(startDate, count = 7) {
  const days = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function getDayColumnCount(gridEl) {
  if (!gridEl) return 7;
  const rootStyles = getComputedStyle(document.documentElement);
  const timeWidth = Number(rootStyles.getPropertyValue("--time-col-width").replace("px", "")) || 32;
  const gap = 6;
  const available = Math.max(0, gridEl.clientWidth - timeWidth - 12);
  const minDayWidth = 92;
  const count = Math.floor((available + gap) / (minDayWidth + gap));
  return Math.max(1, Math.min(7, count || 1));
}

function getDayStep(count) {
  return Math.max(1, Math.ceil(count / 2));
}

function getAdminEarliestSlotDate() {
  let earliest = null;
  adminScheduleState.slots.forEach((slot) => {
    if (!slot.date) return;
    const d = startOfDay(new Date(`${slot.date}T00:00:00`));
    if (!earliest || d < earliest) earliest = d;
  });
  return earliest;
}

let scheduleResizeObserver = null;
let adminScheduleResizeObserver = null;
let adminHelpHeightObserver = null;

function syncAdminHelpCardHeight() {
  if (!quotaHelpBubble || !adminExperimentForm) return;
  if (window.innerWidth < 980) {
    quotaHelpBubble.style.height = "";
    quotaHelpBubble.style.maxHeight = "";
    return;
  }
  const leftCol = quotaHelpBubble.closest(".admin-left");
  if (!leftCol) return;
  const leftRect = leftCol.getBoundingClientRect();
  const bubbleRect = quotaHelpBubble.getBoundingClientRect();
  const rightHeight = adminExperimentForm.getBoundingClientRect().height;
  const usedTop = bubbleRect.top - leftRect.top;
  const target = Math.max(180, Math.floor(rightHeight - usedTop));
  quotaHelpBubble.style.height = `${target}px`;
  quotaHelpBubble.style.maxHeight = `${target}px`;
}

function syncAdminEditHelpCardHeight(panel) {
  if (!panel) return;
  const helpCard = panel.querySelector(".admin-left .info-card");
  const rightForm = panel.querySelector("#adminEditInfoForm");
  if (!helpCard || !rightForm) return;
  if (window.innerWidth < 980) {
    helpCard.style.height = "";
    helpCard.style.maxHeight = "";
    return;
  }
  const leftCol = helpCard.closest(".admin-left");
  if (!leftCol) return;
  const leftRect = leftCol.getBoundingClientRect();
  const cardRect = helpCard.getBoundingClientRect();
  const rightHeight = rightForm.getBoundingClientRect().height;
  const usedTop = cardRect.top - leftRect.top;
  const target = Math.max(180, Math.floor(rightHeight - usedTop));
  helpCard.style.height = `${target}px`;
  helpCard.style.maxHeight = `${target}px`;
}

function attachAdminHelpHeightObserver() {
  if (!adminExperimentForm || adminHelpHeightObserver || typeof ResizeObserver === "undefined") return;
  adminHelpHeightObserver = new ResizeObserver(() => {
    syncAdminHelpCardHeight();
  });
  adminHelpHeightObserver.observe(adminExperimentForm);
  const leftCol = quotaHelpBubble?.closest(".admin-left");
  if (leftCol) adminHelpHeightObserver.observe(leftCol);
  window.addEventListener("resize", syncAdminHelpCardHeight);
}

function attachScheduleResizeObserver() {
  if (!scheduleGrid || scheduleResizeObserver) return;
  scheduleResizeObserver = new ResizeObserver(() => {
    const nextCount = getDayColumnCount(scheduleGrid);
    if (nextCount === scheduleState.dayCount) return;
    scheduleState.dayCount = nextCount;
    if (scheduleState.autoStart) {
      scheduleState.weekStart = normalizeStartDate(new Date(), nextCount);
    }
    if (scheduleState.activeDayIndex >= nextCount) scheduleState.activeDayIndex = 0;
    renderScheduleGrid();
  });
  scheduleResizeObserver.observe(scheduleGrid);
}

function attachAdminScheduleResizeObserver(container) {
  if (!container || adminScheduleResizeObserver) return;
  adminScheduleResizeObserver = new ResizeObserver(() => {
    const nextCount = getDayColumnCount(container);
    if (nextCount === adminScheduleState.dayCount) return;
    adminScheduleState.dayCount = nextCount;
    if (adminScheduleState.autoStart) {
      adminScheduleState.weekStart = normalizeStartDate(new Date(), nextCount);
    }
    if (adminScheduleState.activeDayIndex >= nextCount) adminScheduleState.activeDayIndex = 0;
    renderAdminEditScheduleGrid();
  });
  adminScheduleResizeObserver.observe(container);
}

function renderScheduleGrid() {
  if (!scheduleGrid) return;
  const prevDays = scheduleGrid.querySelector(".schedule-days");
  if (prevDays) scheduleScrollState.schedule = prevDays.scrollLeft;
  scheduleGrid.innerHTML = "";
  let dayCount = getDayColumnCount(scheduleGrid);
  if (scheduleGrid.clientWidth < 200) {
    dayCount = scheduleState.dayCount || dayCount;
    if (!scheduleState.layoutRetry) {
      scheduleState.layoutRetry = true;
      requestAnimationFrame(() => {
        scheduleState.layoutRetry = false;
        renderScheduleGrid();
      });
    }
  }
  if (scheduleState.dayCount !== dayCount) {
    scheduleState.dayCount = dayCount;
    if (scheduleState.autoStart) {
      scheduleState.weekStart = normalizeStartDate(new Date(), dayCount);
    }
    if (scheduleState.activeDayIndex >= dayCount) scheduleState.activeDayIndex = 0;
  }
  const days = buildWeekDates(scheduleState.weekStart, dayCount);
  const lastDay = days[days.length - 1];
  scheduleTitle.textContent = `${days[0].getMonth() + 1}/${days[0].getDate()} - ${lastDay.getMonth() + 1}/${lastDay.getDate()}`;
  const timeColumn = buildTimeColumn(scheduleState);
  const daysContainer = document.createElement("div");
  daysContainer.className = "schedule-days";
  daysContainer.style.setProperty("--day-count", String(dayCount));
  daysContainer.style.gridTemplateColumns = `repeat(${dayCount}, minmax(92px, 1fr))`;

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
let slotNudgeOverlay = null;
let slotNudgeInterval = null;
let slotNudgeContext = null;

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

function applySlotNudge(delta) {
  if (!slotNudgeContext?.renderFn || !slotNudgeContext?.stateRef) return;
  const { renderFn, stateRef, mode, edge } = slotNudgeContext;
  const selectedId = Array.from(stateRef.selectedIds || [])[0];
  const slot = selectedId
    ? stateRef.slots.find((item) => item.id === selectedId)
    : slotNudgeContext.slot;
  if (!slot) return;
  const minDuration = 10;
  if (mode === "resize") {
    if (edge === "top") {
      let nextStart = Math.max(0, Math.min(slot.endMin - minDuration, slot.startMin + delta));
      if (slot.date === formatLocalDate(new Date())) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        if (nextStart < nowMin) nextStart = nowMin;
      }
      slot.startMin = nextStart;
    } else {
      let nextEnd = Math.max(slot.startMin + minDuration, Math.min(1440, slot.endMin + delta));
      slot.endMin = nextEnd;
    }
  } else {
    const duration = slot.endMin - slot.startMin;
    let nextStart = Math.max(0, Math.min(1440 - duration, slot.startMin + delta));
    if (slot.date === formatLocalDate(new Date())) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      if (slot.startMin >= nowMin && nextStart < nowMin) nextStart = nowMin;
    }
    slot.startMin = nextStart;
    slot.endMin = nextStart + duration;
  }
  renderFn();
}

function hideSlotNudgeControls() {
  if (slotNudgeInterval) {
    clearInterval(slotNudgeInterval);
    slotNudgeInterval = null;
  }
  if (slotNudgeOverlay) slotNudgeOverlay.classList.add("hidden");
  slotNudgeContext = null;
}

function showSlotNudgeControls(context) {
  slotNudgeContext = context;
  if (!slotNudgeOverlay) {
    const overlay = document.createElement("div");
    overlay.className = "slot-nudge-overlay hidden";
    overlay.innerHTML = `
      <button type="button" class="ghost" data-nudge="up">▲</button>
      <button type="button" class="ghost" data-nudge="down">▼</button>
      <button type="button" class="ghost" data-nudge="close">×</button>
    `;
    const startRepeat = (delta) => {
      applySlotNudge(delta);
      if (slotNudgeInterval) clearInterval(slotNudgeInterval);
      slotNudgeInterval = setInterval(() => applySlotNudge(delta), 120);
    };
    const stopRepeat = () => {
      if (slotNudgeInterval) {
        clearInterval(slotNudgeInterval);
        slotNudgeInterval = null;
      }
    };
    overlay.querySelector('[data-nudge="up"]')?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startRepeat(-1);
    });
    overlay.querySelector('[data-nudge="down"]')?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startRepeat(1);
    });
    overlay.querySelector('[data-nudge="close"]')?.addEventListener("click", () => {
      hideSlotNudgeControls();
    });
    document.addEventListener("pointerup", stopRepeat, { passive: true });
    document.addEventListener("pointercancel", stopRepeat, { passive: true });
    document.body.appendChild(overlay);
    slotNudgeOverlay = overlay;
  }
  slotNudgeOverlay.classList.remove("hidden");
}

function startTouchDrag(slot, stateRef, renderFn) {
  let activeTouchId = null;
  let dragStartY = null;
  let dragStartMin = slot.startMin;
  let dragEndMin = slot.endMin;
  showSlotNudgeControls({ slot, stateRef, renderFn, mode: "move", edge: null });

  const resolveTouch = (event) => {
    if (activeTouchId === null) {
      const initial = event.touches?.[0] || event.changedTouches?.[0] || null;
      if (initial) activeTouchId = initial.identifier;
      return initial;
    }
    const allTouches = [...(event.touches || []), ...(event.changedTouches || [])];
    return allTouches.find((touch) => touch.identifier === activeTouchId) || null;
  };

  const onMove = (event) => {
    const touch = resolveTouch(event);
    if (!touch) return;
    if (dragStartY === null) {
      dragStartY = touch.pageY;
      dragStartMin = slot.startMin;
      dragEndMin = slot.endMin;
    }
    const delta = touch.pageY - dragStartY;
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
  const onEnd = (event) => {
    if (activeTouchId !== null) {
      const hasTargetEnded = [...(event.changedTouches || [])].some((touch) => touch.identifier === activeTouchId);
      if (!hasTargetEnded) return;
    }
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("touchcancel", onEnd);
    activeTouchId = null;
    mergeOverlappingSlots(stateRef);
    renderFn();
  };
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);
  document.addEventListener("touchcancel", onEnd);
}

function startTouchResize(slotEl, slot, stateRef, renderFn, startY, preferredEdge = null) {
  let resizeEdge = preferredEdge;
  let activeTouchId = null;
  const body = slotEl.closest(".schedule-day-body");
  if (!body) return;

  const resolveTouch = (event) => {
    if (activeTouchId === null) {
      const initial = event.touches?.[0] || event.changedTouches?.[0] || null;
      if (initial) activeTouchId = initial.identifier;
      return initial;
    }
    const allTouches = [...(event.touches || []), ...(event.changedTouches || [])];
    return allTouches.find((touch) => touch.identifier === activeTouchId) || null;
  };

  const onMove = (event) => {
    const touch = resolveTouch(event);
    if (!touch) return;
    if (!resizeEdge) {
      const rect = slotEl.getBoundingClientRect();
      resizeEdge = touch.clientY < rect.top + rect.height / 2 ? "top" : "bottom";
      showSlotNudgeControls({ slot, stateRef, renderFn, mode: "resize", edge: resizeEdge });
    }
    const bodyTop = body.getBoundingClientRect().top;
    const viewOffset = getViewOffsetPx(stateRef);
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
  const onEnd = (event) => {
    if (activeTouchId !== null) {
      const hasTargetEnded = [...(event.changedTouches || [])].some((touch) => touch.identifier === activeTouchId);
      if (!hasTargetEnded) return;
    }
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("touchcancel", onEnd);
    activeTouchId = null;
    mergeOverlappingSlots(stateRef);
    renderFn();
  };
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);
  document.addEventListener("touchcancel", onEnd);
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
          onClick: () => startTouchDrag(slot, stateRef, renderFn),
        },
        {
          label: "调整上边界",
          onClick: () => {
            showSlotNudgeControls({ slot, stateRef, renderFn, mode: "resize", edge: "top" });
            startTouchResize(slotEl, slot, stateRef, renderFn, startY, "top");
          },
        },
        {
          label: "调整下边界",
          onClick: () => {
            showSlotNudgeControls({ slot, stateRef, renderFn, mode: "resize", edge: "bottom" });
            startTouchResize(slotEl, slot, stateRef, renderFn, startY, "bottom");
          },
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
    showSlotNudgeControls({ slot, stateRef, renderFn, mode: "move", edge: null });
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
      showSlotNudgeControls({ slot, stateRef, renderFn, mode: "resize", edge });
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
      showSlotNudgeControls({ slot, stateRef, renderFn, mode: "resize", edge });
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
  dayCount: 7,
  autoStart: true,
  layoutRetry: false,
  viewStartMin: VIEW_START_DEFAULT,
  viewEndMin: VIEW_END_DEFAULT,
};

function renderAdminEditScheduleGrid() {
  const container = document.getElementById("adminEditScheduleGrid");
  if (!container) return;
  attachAdminScheduleResizeObserver(container);
  const prevDays = container.querySelector(".schedule-days");
  if (prevDays) scheduleScrollState.admin = prevDays.scrollLeft;
  container.innerHTML = "";
  let dayCount = getDayColumnCount(container);
  if (container.clientWidth < 200) {
    dayCount = adminScheduleState.dayCount || dayCount;
    if (!adminScheduleState.layoutRetry) {
      adminScheduleState.layoutRetry = true;
      requestAnimationFrame(() => {
        adminScheduleState.layoutRetry = false;
        renderAdminEditScheduleGrid();
      });
    }
  }
  if (adminScheduleState.dayCount !== dayCount) {
    adminScheduleState.dayCount = dayCount;
    if (adminScheduleState.autoStart) {
      adminScheduleState.weekStart = normalizeStartDate(new Date(), dayCount);
    }
    if (adminScheduleState.activeDayIndex >= dayCount) adminScheduleState.activeDayIndex = 0;
  }
  const days = buildWeekDates(adminScheduleState.weekStart, dayCount);

  const title = document.getElementById("adminEditScheduleTitle");
  if (title && days.length) {
    const lastDay = days[days.length - 1];
    title.textContent = `${days[0].getMonth() + 1}/${days[0].getDate()} - ${lastDay.getMonth() + 1}/${lastDay.getDate()}`;
  }

  const timeColumn = buildTimeColumn(adminScheduleState);
  const daysContainer = document.createElement("div");
  daysContainer.className = "schedule-days";
  daysContainer.style.setProperty("--day-count", String(dayCount));
  daysContainer.style.gridTemplateColumns = `repeat(${dayCount}, minmax(92px, 1fr))`;
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
    showSlotNudgeControls({ slot, stateRef, renderFn, mode: "move", edge: null });
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

async function loadMajors() {
  try {
    const data = await apiRequest("/majors", { method: "GET" });
    const merged = new Set([...DEFAULT_MAJORS, ...(data.majors || [])]);
    state.majors = Array.from(merged).sort();
    renderMajorSuggestions();
  } catch {
    state.majors = [...DEFAULT_MAJORS];
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

function normalizeMajorValue(value) {
  return String(value || "").trim();
}

function syncMajorsHidden() {
  if (!majorHidden) return;
  majorHidden.value = JSON.stringify(state.selectedMajors || []);
}

function renderMajorTags() {
  if (!majorTags) return;
  majorTags.innerHTML = "";
  (state.selectedMajors || []).forEach((major) => {
    const tag = document.createElement("span");
    tag.className = "multi-tag";
    tag.textContent = major;
    majorTags.appendChild(tag);
  });
}

function setSelectedMajors(list) {
  const cleaned = (Array.isArray(list) ? list : [])
    .map((item) => normalizeMajorValue(item))
    .filter(Boolean);
  const unique = Array.from(new Set(cleaned));
  state.selectedMajors = unique.includes("无") ? ["无"] : unique;
  syncMajorsHidden();
  renderMajorTags();
}

function addMajor(value) {
  const normalized = normalizeMajorValue(value);
  if (!normalized) return;
  if (normalized === "无") {
    state.selectedMajors = ["无"];
  } else {
    state.selectedMajors = (state.selectedMajors || []).filter((item) => item !== "无");
    if (!state.selectedMajors.includes(normalized)) {
      state.selectedMajors.push(normalized);
    }
  }
  syncMajorsHidden();
  renderMajorTags();
  renderMajorSuggestions("");
}

function removeMajor() {
  return;
}

function renderMajorSuggestions(query = "") {
  if (!majorSuggestions) return;
  const keyword = String(query || "").trim();
  const source = state.majors || DEFAULT_MAJORS;
  const list = keyword ? source.filter((item) => item.includes(keyword)) : source;
  const filtered = list.filter((item) => !(state.selectedMajors || []).includes(item));
  majorSuggestions.innerHTML = "";
  if (filtered.length === 0) {
    majorSuggestions.classList.remove("active");
    return;
  }

  filtered.slice(0, 8).forEach((item) => {
    const el = document.createElement("div");
    el.className = "autocomplete-item";
    el.textContent = item;
    el.addEventListener("click", () => {
      addMajor(item);
      if (majorInput) majorInput.value = "";
      majorSuggestions.classList.remove("active");
    });
    majorSuggestions.appendChild(el);
  });
  majorSuggestions.classList.add("active");
}

async function loadExperiments() {
  if (!state.token) return;
  const container = experimentForm?.querySelector(".experiment-list");
  setLoadingBlock(container, "正在加载可报名实验...");
  setLoadingBlock(appliedExperimentList, "正在加载已报名实验...");
  try {
    const data = await apiRequest("/experiments", { method: "GET" });
    state.experiments = data.experiments || [];
    const participation = state.profile?.experiment_participation || {};
    if (state.selectedExperimentUid) {
      const exists = state.experiments.some((exp) => exp.experiment_uid === state.selectedExperimentUid);
      const applied = !!participation[state.selectedExperimentUid];
      if (!exists || applied) {
        state.selectedExperimentUid = null;
        state.selectedSlotIds.clear();
      }
    }
    renderExperiments();
    renderAppliedExperiments();
  } catch (error) {
    state.experiments = [];
    renderExperiments();
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

function formatSlotRequirementHint(value) {
  const { operator, count } = parseSlotRequirement(value || "=1");
  if (operator === "=") return `请选中${count}个时段`;
  if (operator === ">=") return `请至少选中${count}个时段`;
  if (operator === ">") return `请至少选中超过${count}个时段`;
  if (operator === "<=") return `请最多选中${count}个时段`;
  if (operator === "<") return `请最多选中少于${count}个时段`;
  return `请选中${count}个时段`;
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
  const participation = state.profile?.experiment_participation || {};
  if (!state.experiments.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "您暂无可报名实验。若新增实验或名额，将在此处显示可报名的实验列表。";
    container.appendChild(empty);
    return;
  }

  let rendered = 0;
  state.experiments.forEach((exp) => {
    if (participation[exp.experiment_uid]) return;
    const card = document.createElement("div");
    card.className = "experiment-card";
    card.dataset.experimentUid = exp.experiment_uid;
    const isSelected = state.selectedExperimentUid === exp.experiment_uid;
    if (isSelected) card.classList.add("selected");
    const eligibility = exp.eligibility?.ok
      ? ""
      : exp.eligibility?.reason === "您所属分组已满员"
        ? "名额已满"
        : exp.eligibility?.reason || "暂不可报名";
    const rewardText = formatRewardWithUnit(exp.reward);
    const deviceHint = exp.device_restriction_hint || "";
    const noticeText = exp.notes ? `注意：${exp.notes}` : "";
    const slotHint = exp.schedule_required
      ? formatSlotRequirementHint(exp.schedule_slots_required || "=1")
      : "";
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
        <p class="hint">${rewardText}</p>
        ${deviceHint ? `<p class="notice">⚠️ ${deviceHint}</p>` : ""}
        ${noticeText ? `<p class="notice">${noticeText}</p>` : ""}
        ${slotHint ? `<p class="hint">${slotHint}</p>` : ""}
        ${eligibility ? `<p class="hint">${eligibility}</p>` : ""}
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
    rendered += 1;
  });

  if (rendered === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "您暂无可报名实验。若新增实验或名额，将在此处显示可报名的实验列表。";
    container.appendChild(empty);
  }

  if (state.selectedExperimentUid) {
    const selected = state.experiments.find((exp) => exp.experiment_uid === state.selectedExperimentUid);
    if (selected?.schedule_required) {
      const slots = state.experimentSlots[selected.experiment_uid] || [];
      renderExperimentSlots(selected, slots);
    }
  }
}

function renderAppliedExperiments() {
  if (!appliedExperimentList) return;
  const participation = state.profile?.experiment_participation || {};
  const entries = Object.entries(participation);
  appliedExperimentList.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "暂无已报名实验。";
    appliedExperimentList.appendChild(empty);
    return;
  }

  const applied = entries.map(([uid, record]) => {
    const exp = state.experiments.find((item) => item.experiment_uid === uid);
    if (!exp) return null;
    const slots = Array.isArray(record?.slots) ? record.slots : [];
    const startTimes = slots
      .map((slot) => Date.parse(slot.start_time || slot.startTime || ""))
      .filter((value) => !Number.isNaN(value));
    const sortTime = startTimes.length
      ? Math.max(...startTimes)
      : Date.parse(record?.applied_at || "") || 0;
    return {
      uid,
      name: exp?.name || record?.experiment_type || uid,
      type: exp?.type || record?.experiment_type || "-",
      location: exp?.location || "",
      reward: exp?.reward || "",
      contact: exp?.contact_phone || "",
      notes: exp?.notes || "",
      deviceHint: exp?.device_restriction_hint || "",
      accessLink: record?.access_url || record?.location_link || exp?.location_link || "",
      latestTime: sortTime,
      slotLabel: startTimes.length
        ? formatSlotDateTime(new Date(Math.max(...startTimes)).toISOString())
        : "-",
    };
  }).filter(Boolean);

  applied.sort((a, b) => b.latestTime - a.latestTime);

  applied.forEach((item) => {
    const card = document.createElement("div");
    card.className = "experiment-card";
    const contact = item.contact ? `主试联系方式：${item.contact}` : "主试联系方式：-";
    const notice = item.notes ? `注意：${item.notes}` : "";
    const reward = formatRewardWithUnit(item.reward);
    const deviceNotice = item.deviceHint ? `⚠️ ${item.deviceHint}` : "";
    const hasOnlineLink = item.location === "在线";
    card.innerHTML = `
      <div class="experiment-card-header">
        <strong>${item.name}</strong>
        <span>${item.type}</span>
      </div>
      <div class="experiment-card-body">
        <p class="hint">预约时间：${item.slotLabel}</p>
        <p class="hint">${reward}</p>
        ${deviceNotice ? `<p class="notice">${deviceNotice}</p>` : ""}
        ${notice ? `<p class="notice">${notice}</p>` : ""}
        <p class="hint">${contact}</p>
        ${hasOnlineLink ? `<button type="button" class="ghost" data-action="copy-link">复制实验链接</button>` : ""}
      </div>
    `;
    if (hasOnlineLink) {
      card.querySelector("[data-action='copy-link']")?.addEventListener("click", async () => {
        try {
          const link = item.accessLink;
          if (!/^https?:\/\//i.test(String(link || ""))) {
            setStatus(experimentStatus, "当前实验链接不可用，请联系主试。", true);
            return;
          }

          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(link);
            setStatus(experimentStatus, "已复制实验链接。请尽快在符合要求设备中打开。");
          } else {
            window.prompt("复制实验链接", link);
            setStatus(experimentStatus, "请复制链接并在符合要求设备中打开。");
          }
        } catch {
          window.prompt("复制实验链接", item.accessLink || "");
        }
      });
    }
    appliedExperimentList.appendChild(card);
  });
}

async function loadAdminExperiments() {
  if (!(state.role === "admin" || state.role === "root")) return;
  setAdminTabsLoading();
  try {
    const data = await apiRequest("/admin/experiments", { method: "GET" });
    state.adminExperiments = data.experiments || [];
    renderAdminTabs();
    if (state.adminActiveTab !== "new") {
      await loadAdminExperimentDetail(state.adminActiveTab);
    }
  } catch {
    state.adminExperiments = [];
    renderAdminTabs();
  }
}

function renderAdminTabs() {
  if (!adminTabs) return;
  refreshAdminTabCopyHint();
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
    tab.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const ok = window.confirm(`复制实验「${exp.name}」配置到“新实验”？\n（不会复制排期）`);
      if (!ok) return;
      copyExperimentToNewDraft(exp);
    });
    let longPressTimer = null;
    tab.addEventListener("touchstart", () => {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        const ok = window.confirm(`复制实验「${exp.name}」配置到“新实验”？\n（不会复制排期）`);
        if (!ok) return;
        copyExperimentToNewDraft(exp);
      }, 650);
    }, { passive: true });
    const clearLongPress = () => {
      if (!longPressTimer) return;
      clearTimeout(longPressTimer);
      longPressTimer = null;
    };
    tab.addEventListener("touchend", clearLongPress, { passive: true });
    tab.addEventListener("touchmove", clearLongPress, { passive: true });
    tab.addEventListener("touchcancel", clearLongPress, { passive: true });
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
  const panel = document.getElementById("adminPanelExperiments");
  setLoadingBlock(panel, "正在加载实验详情...");
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
  const detailAccessConfig = safeJsonParse(experiment.access_control_config_json, null) || {};
  const detailSource = detailAccessConfig?.source || "";
  const detailIsHosted = detailSource === "hosted_upload";
  const detailIsGithub = detailAccessConfig?.source === "github";
  const detailDownloadPolicy = detailAccessConfig?.download_policy || "upload_only";
  const sourceCardHtml = detailIsHosted
    ? `
      <div class="hosted-assets-card" id="adminHostedAssetsCard">
        <div class="hosted-assets-row">
          <strong>在线实验文件</strong>
          <span class="hint" id="adminHostedAssetsMeta">统计中...</span>
        </div>
        <div class="hosted-assets-actions" style="margin-top:0.6rem;">
          <button type="button" class="ghost" id="adminHostedDownloadBtn">下载完整实验文件</button>
          <button type="button" class="ghost" id="adminHostedReuploadBtn">重新上传并覆盖</button>
          <input type="file" id="adminHostedReuploadInput" webkitdirectory directory multiple style="display:none;" />
        </div>
        <div class="hint" id="adminHostedReuploadStatus" style="margin-top:0.45rem;"></div>
      </div>
    `
    : "";
  const showScheduleEditor = Number(experiment.schedule_required) === 1;
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
                    <p>可用字段：<span class="mono">年龄</span>、<span class="mono">所在地区</span>、<span class="mono">左/右利手</span>、<span class="mono">左眼近视度数</span>、<span class="mono">右眼近视度数</span>、<span class="mono">民族</span>、<span class="mono">职业</span>、<span class="mono">专业</span>、<span class="mono">受教育年限</span>、<span class="mono">身高</span>、<span class="mono">体重</span>、<span class="mono">头围</span>、<span class="mono">参与过</span>。</p>
                    <p>示例：<span class="mono">年龄>=18 & 年龄<30 & (左眼近视度数<600|右眼近视度数<600)</span></p>
                    <p>示例：<span class="mono">专业!=心理学类</span> 或 <span class="mono">职业=学生</span></p>
                    <p>示例：<span class="mono">参与过!=E000001</span> 或 <span class="mono">参与过=眼动</span></p>
                    <p>提示：<span class="mono">专业</span> 为多选字段，<span class="mono">=</span> 表示包含该项，<span class="mono">!=</span> 表示不包含该项。</p>
          <p>2) 名额分配写法：每行是一组配额；同一行内用 <span class="mono">&</span> 连接多个条件；<span class="mono">条件*人数</span>；使用 <span class="mono">ALL*20</span> 表示不限条件。</p>
          <p>区间写法：<span class="mono">年龄[18,30)</span> 表示 $18\le \text{年龄}<30$；<span class="mono">[</span> 与 <span class="mono">]</span> 表示包含，<span class="mono">(</span> 与 <span class="mono">)</span> 表示不包含。</p>
          <p>示例：<span class="mono">性别=男*10 & =女*10</span></p>
          <p>示例：<span class="mono">专业=心理学类*10 & =法学类*10</span></p>
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
          <label id="adminEditGithubRepoField" class="hidden">
            GitHub仓库地址
            <input name="github_repo" id="adminEditGithubRepo" value="${detailAccessConfig.github_repo || ""}" />
          </label>
          <label id="adminEditDownloadPolicyField" class="hidden">
            数据保存方式
            <select id="adminEditDownloadPolicy">
              <option value="download_and_upload" ${detailDownloadPolicy === "download_and_upload" ? "selected" : ""}>同时上传到服务器并下载到本地</option>
              <option value="upload_only" ${detailDownloadPolicy === "upload_only" ? "selected" : ""}>仅上传到服务器</option>
              <option value="download_only" ${detailDownloadPolicy === "download_only" ? "selected" : ""}>仅下载到本地（不推荐）</option>
            </select>
          </label>
          ${sourceCardHtml}
          <label id="adminEditAccessControlModeField" class="hidden">
            在线访问控制
            <select name="access_control_mode" id="adminEditAccessControlMode">
              <option value="none" data-hint="原链接：直接呈现/跳转原链接，被试将能在任意时刻/设备访问该链接。">否（原链接）</option>
              <option value="proxy" data-hint="反向代理：隐藏原链接，但不适合频繁和源传输数据的动态网页。">是（反向代理）</option>
              <option value="token" data-hint="拼接令牌：需要在实验页面 head 添加脚本校验 token。">是（拼接令牌）</option>
            </select>
            <span class="hint" id="adminEditAccessControlHint">原链接：直接呈现/跳转原链接，被试将能在任意时刻/设备访问该链接。</span>
          </label>
          <div class="info-card hidden" id="adminEditTokenScriptHelp">
            <strong>拼接令牌操作说明</strong>
            <p class="hint">将脚本粘贴到实验页面 <span class="mono">head</span> 内（建议放在最前面）。二选一：</p>
            <div class="script-pair">
              <div class="script-card">
                <div class="script-title">方案 A（遮罩验证，推荐）</div>
                <p class="hint">进入页面先显示验证遮罩，通过后自动放行。</p>
                <button type="button" class="ghost" data-copy-script="mask">复制脚本</button>
              </div>
              <div class="script-card">
                <div class="script-title">方案 B（直接阻断）</div>
                <p class="hint">直接隐藏页面，验证失败则显示错误提示。</p>
                <button type="button" class="ghost" data-copy-script="block">复制脚本</button>
              </div>
            </div>
          </div>
          <fieldset class="checkbox-group" id="adminEditAllowedDevices">
            <legend>允许设备</legend>
            <label><input type="checkbox" name="allowed_devices" value="desktop" />电脑</label>
            <label><input type="checkbox" name="allowed_devices" value="tablet" />平板</label>
            <label><input type="checkbox" name="allowed_devices" value="mobile" />手机</label>
          </fieldset>
          <label>
            <input type="checkbox" id="adminEditSameDeviceSingleAccount" ${Number(experiment.same_device_single_account ?? 1) !== 0 ? "checked" : ""} />
            同一实验中，同一设备禁止切换不同账号重复报名
          </label>
          <label>
            内容简介
            <textarea name="description" rows="3" id="adminEditDescription">${experiment.description || ""}</textarea>
          </label>
          <label>
            注意事项
            <textarea name="notes" rows="1" class="note-input" id="adminEditNotes">${experiment.notes || ""}</textarea>
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
    <div class="schedule-editor full-width ${showScheduleEditor ? "" : "hidden"}" id="adminEditScheduleEditor">
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
  const editGithubRepo = panel.querySelector("#adminEditGithubRepo");
  const editGithubRepoField = panel.querySelector("#adminEditGithubRepoField");
  const editDownloadPolicy = panel.querySelector("#adminEditDownloadPolicy");
  const editDownloadPolicyField = panel.querySelector("#adminEditDownloadPolicyField");
  const editAccessControlMode = panel.querySelector("#adminEditAccessControlMode");
  const editAccessControlModeField = panel.querySelector("#adminEditAccessControlModeField");
  const editAccessControlHint = panel.querySelector("#adminEditAccessControlHint");
  const editTokenScriptHelp = panel.querySelector("#adminEditTokenScriptHelp");
  const editAllowedDevices = panel.querySelector("#adminEditAllowedDevices");
  const editSameDeviceSingleAccount = panel.querySelector("#adminEditSameDeviceSingleAccount");
  const editContactPhone = panel.querySelector("#adminEditContactPhone");
  const editDescription = panel.querySelector("#adminEditDescription");
  const editNotes = panel.querySelector("#adminEditNotes");
  const editDuration = panel.querySelector("#adminEditDuration");
  const editSlotRequirement = panel.querySelector("#adminEditSlotRequirement");
  const editSlotRequirementField = panel.querySelector("#adminEditSlotRequirementField");
  const editReward = panel.querySelector("#adminEditReward");
  const hostedMeta = panel.querySelector("#adminHostedAssetsMeta");
  const hostedDownloadBtn = panel.querySelector("#adminHostedDownloadBtn");
  const hostedReuploadBtn = panel.querySelector("#adminHostedReuploadBtn");
  const hostedReuploadInput = panel.querySelector("#adminHostedReuploadInput");
  const hostedReuploadStatus = panel.querySelector("#adminHostedReuploadStatus");

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

  const accessConfig = safeJsonParse(experiment.access_control_config_json, null) || {};
  const isHosted = accessConfig?.source === "hosted_upload";
  const isGithub = accessConfig?.source === "github";

  const updateEditTokenHelp = () => {
    const show = editLocation?.value === "在线"
      && !isHosted
      && editAccessControlMode?.value === "token";
    editTokenScriptHelp?.classList.toggle("hidden", !show);
  };
  bindCopyButtons(panel);

  const syncEditLocationFields = () => {
    if (!editLocation) return;
    const isOnline = editLocation.value === "在线";
    const isCustom = editLocation.value === "其他";
    const usingGithub = isOnline && !!String(editGithubRepo?.value || "").trim();
    editLocationLinkField?.classList.toggle("hidden", !isOnline);
    editLocationCustomField?.classList.toggle("hidden", !isCustom);
    editGithubRepoField?.classList.toggle("hidden", !isOnline);
    editDownloadPolicyField?.classList.toggle("hidden", !(isOnline && (isHosted || isGithub || usingGithub)));
    editAccessControlModeField?.classList.toggle("hidden", !isOnline);
    if (!isOnline && editAccessControlMode) {
      editAccessControlMode.value = "none";
    }
    updateAccessControlHint(editAccessControlMode, editAccessControlHint);
    updateEditTokenHelp();
  };
  syncEditLocationFields();
  editLocation?.addEventListener("change", syncEditLocationFields);
  editGithubRepo?.addEventListener("input", syncEditLocationFields);

  if (editAccessControlMode) {
    editAccessControlMode.value = experiment.access_control_mode || "none";
    const proxyOption = Array.from(editAccessControlMode.options || []).find((opt) => opt.value === "proxy");
    if (proxyOption) {
      proxyOption.disabled = isHosted || isGithub;
      if ((isHosted || isGithub) && editAccessControlMode.value === "proxy") {
        editAccessControlMode.value = "token";
      }
    }
    const tokenOption = Array.from(editAccessControlMode.options || []).find((opt) => opt.value === "token");
    if (tokenOption) {
      tokenOption.dataset.hint = (isHosted || isGithub)
        ? "拼接令牌：系统自动注入验证与一次性访问控制。"
        : "拼接令牌：需要在实验页面 head 添加脚本校验 token。";
    }
    updateAccessControlHint(editAccessControlMode, editAccessControlHint);
    editAccessControlMode.addEventListener("change", () => {
      updateAccessControlHint(editAccessControlMode, editAccessControlHint);
      updateEditTokenHelp();
    });
  }
  if (editAllowedDevices) {
    const allowed = new Set(safeJsonParse(experiment.allowed_devices_json, ["desktop", "tablet", "mobile"]));
    editAllowedDevices.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = allowed.has(input.value);
    });
  }

  const isAutoGeneratedLink = isHosted || isGithub;
  if (editLocationLink && isAutoGeneratedLink) {
    editLocationLink.disabled = true;
    editLocationLink.title = "该链接由系统根据托管资源自动生成，发布后不可手动修改";
    editLocationLink.classList.add("readonly-field");
  }
  if (editLocation && isAutoGeneratedLink) {
    editLocation.disabled = true;
    editLocation.title = "托管资源实验地点固定为在线";
    editLocation.classList.add("readonly-field");
  }

  if (isHosted && accessConfig.asset_prefix && hostedMeta) {
    getHostedUploadSummary(accessConfig.asset_prefix)
      .then((summary) => {
        hostedMeta.textContent = `${summary.file_count || 0} 个文件 · ${formatBytes(summary.total_bytes || 0)}`;
      })
      .catch(() => {
        hostedMeta.textContent = "统计失败";
      });
  }

  hostedDownloadBtn?.addEventListener("click", async () => {
    if (!isHosted || !accessConfig.asset_prefix) return;
    try {
      hostedDownloadBtn.disabled = true;
      await downloadApiFile(
        `/admin/experiment/upload/archive?prefix=${encodeURIComponent(accessConfig.asset_prefix)}`,
        `${experiment.experiment_uid}_assets.tar`
      );
    } catch (error) {
      setStatus(adminExperimentStatus, error.message, true);
    } finally {
      hostedDownloadBtn.disabled = false;
    }
  });

  hostedReuploadBtn?.addEventListener("click", () => {
    hostedReuploadInput?.click();
  });

  hostedReuploadInput?.addEventListener("change", async (event) => {
    try {
      if (!isHosted || !accessConfig.asset_prefix) {
        throw new Error("当前实验没有可覆盖的在线上传前缀");
      }
      hostedReuploadBtn.disabled = true;
      await replaceHostedUpload(accessConfig.asset_prefix, event.target?.files, hostedReuploadStatus);
      const summary = await getHostedUploadSummary(accessConfig.asset_prefix);
      if (hostedMeta) hostedMeta.textContent = `${summary.file_count || 0} 个文件 · ${formatBytes(summary.total_bytes || 0)}`;
      setStatus(adminExperimentStatus, "实验文件已覆盖上传");
    } catch (error) {
      if (hostedReuploadStatus) hostedReuploadStatus.textContent = error.message;
      setStatus(adminExperimentStatus, error.message, true);
    } finally {
      hostedReuploadBtn.disabled = false;
      if (hostedReuploadInput) hostedReuploadInput.value = "";
    }
  });

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
      adminScheduleState.weekStart = normalizeStartDate(
        new Date(`${allSlots[0].date}T00:00:00`),
        adminScheduleState.dayCount
      );
      adminScheduleState.autoStart = false;
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

  if (showScheduleEditor) {
    loadScheduleFromSlots(slots);
  }

  saveInfoBtn?.addEventListener("click", async () => {
    try {
      const locationValue = editLocation?.value === "其他" ? editLocationCustom?.value : editLocation?.value;
      if (!locationValue) {
        setStatus(adminExperimentStatus, "请填写实验地点", true);
        return;
      }
      if (isHosted && editAccessControlMode?.value === "proxy") {
        setStatus(adminExperimentStatus, "在线上传不支持代理模式", true);
        return;
      }
      const allowedDevices = getCheckedValues(panel, "allowed_devices");
      const githubRepoValue = String(editGithubRepo?.value || "").trim();
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
          access_control_mode: editAccessControlMode?.value || "none",
          allowed_devices: allowedDevices,
          same_device_single_account: editSameDeviceSingleAccount?.checked !== false,
          github_repo: githubRepoValue || null,
          download_policy: editDownloadPolicy?.value || null,
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
    const todayStart = normalizeStartDate(new Date(), adminScheduleState.dayCount);
    const earliestSlot = getAdminEarliestSlotDate();
    const earliestStart = earliestSlot
      ? normalizeStartDate(earliestSlot, adminScheduleState.dayCount)
      : todayStart;
    const minStart = earliestStart < todayStart ? earliestStart : todayStart;
    const next = new Date(adminScheduleState.weekStart);
    next.setDate(next.getDate() - getDayStep(adminScheduleState.dayCount));
    if (next < minStart) return;
    adminScheduleState.weekStart = next;
    adminScheduleState.autoStart = false;
    renderAdminEditScheduleGrid();
  });

  editScheduleNext?.addEventListener("click", () => {
    const next = new Date(adminScheduleState.weekStart);
    next.setDate(next.getDate() + getDayStep(adminScheduleState.dayCount));
    adminScheduleState.weekStart = next;
    adminScheduleState.autoStart = false;
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

  if (showScheduleEditor) {
    renderAdminEditScheduleGrid();
  }
  requestAnimationFrame(() => syncAdminEditHelpCardHeight(panel));
  window.addEventListener("resize", () => syncAdminEditHelpCardHeight(panel), { passive: true, once: true });
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
  setLoadingBlock(adminExperimentList, "正在加载实验与被试管理列表...");
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
      <button type="button" class="ghost" data-action="download-all">下载完整数据集</button>
      <button type="button" class="ghost" data-action="download-participants">下载被试表</button>
      <button type="button" class="ghost" data-action="toggle">展开参与名单</button>
      <div class="admin-participant-list hidden"></div>
    `;
    const downloadAllBtn = card.querySelector("[data-action='download-all']");
    const downloadParticipantsBtn = card.querySelector("[data-action='download-participants']");
    const toggleBtn = card.querySelector("[data-action='toggle']");
    const list = card.querySelector(".admin-participant-list");
    downloadAllBtn?.addEventListener("click", async () => {
      try {
        downloadAllBtn.disabled = true;
        await downloadApiFile(
          `/admin/experiment/data/download?experiment_uid=${encodeURIComponent(exp.experiment_uid)}`,
          `${exp.experiment_uid}_dataset.tar`
        );
      } catch (error) {
        alert(error.message || "下载失败");
      } finally {
        downloadAllBtn.disabled = false;
      }
    });
    downloadParticipantsBtn?.addEventListener("click", async () => {
      try {
        downloadParticipantsBtn.disabled = true;
        await downloadParticipantsCsv(exp.experiment_uid);
      } catch (error) {
        alert(error.message || "下载失败");
      } finally {
        downloadParticipantsBtn.disabled = false;
      }
    });
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
  setLoadingBlock(list, "正在加载参与名单...");
  try {
    const data = await apiRequest(`/admin/experiment?experiment_uid=${encodeURIComponent(experimentUid)}`, {
      method: "GET",
    });
    const participants = [];
    const isScheduled = Number(data?.experiment?.schedule_required || 0) === 1;
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
      const isRejected = String(participant.participant_status || participant.status || "").toLowerCase() === "rejected" || participant.rejected === true;
      if (isRejected) item.classList.add("rejected");
      const startRaw = isScheduled
        ? participant.slot?.start_time
        : (participant.actual_opened_at || participant.participated_at || participant.applied_at || "-");
      const endRaw = isScheduled
        ? (participant.slot?.end_time || "-")
        : (participant.actual_ended_at || "-");
      const startText = formatCompactDateTime(startRaw);
      const endText = formatCompactDateTime(endRaw);
      const rejectMeta = isRejected
        ? `（已拒绝${participant.rejected_at ? `：${participant.rejected_at}` : ""}${participant.rejection_reason ? `，原因：${participant.rejection_reason}` : ""}）`
        : "";
      item.innerHTML = `
        <span>${participant.name} (${participant.user_uid}) · ${startText} to ${endText} ${rejectMeta}</span>
        <button type="button" class="ghost" data-action="download-user">下载数据</button>
        <button type="button" class="ghost" data-action="reject" ${isRejected ? "disabled" : ""}>${isRejected ? "已拒绝" : "拒绝被试"}</button>
        <button type="button" class="ghost" data-action="restore" ${isRejected ? "" : "disabled"}>恢复被试</button>
        <button type="button" class="ghost" data-action="feedback">添加评价</button>
      `;
      item.querySelector("[data-action='download-user']")?.addEventListener("click", async () => {
        try {
          await downloadApiFile(
            `/admin/experiment/data/download-user?experiment_uid=${encodeURIComponent(experimentUid)}&user_uid=${encodeURIComponent(participant.user_uid)}`,
            `${experimentUid}_${participant.user_uid}_dataset.tar`
          );
        } catch (error) {
          alert(error.message || "下载失败");
        }
      });
      item.querySelector("[data-action='feedback']").addEventListener("click", async () => {
        const feedback = prompt("输入评价信息");
        if (!feedback) return;
        await apiRequest("/admin/experiment/feedback", {
          method: "POST",
          json: { user_uid: participant.user_uid, experiment_uid: experimentUid, feedback },
        });
      });
      item.querySelector("[data-action='reject']")?.addEventListener("click", async () => {
        const reason = prompt("可选：输入拒绝原因（留空可直接确认）", "") ?? "";
        const ok = window.confirm(`确认拒绝 ${participant.name}（${participant.user_uid}）？\n拒绝后该记录不计入名额与完整数据集。`);
        if (!ok) return;
        try {
          await apiRequest("/admin/experiment/participant/reject", {
            method: "POST",
            json: {
              experiment_uid: experimentUid,
              user_uid: participant.user_uid,
              slot_id: participant.slot?.id,
              reason,
            },
          });
          await loadParticipantsForExperiment(experimentUid, list);
        } catch (error) {
          alert(error.message || "拒绝失败");
        }
      });
      item.querySelector("[data-action='restore']")?.addEventListener("click", async () => {
        const ok = window.confirm(`确认恢复 ${participant.name}（${participant.user_uid}）为有效被试？`);
        if (!ok) return;
        try {
          await apiRequest("/admin/experiment/participant/restore", {
            method: "POST",
            json: {
              experiment_uid: experimentUid,
              user_uid: participant.user_uid,
              slot_id: participant.slot?.id,
            },
          });
          await loadParticipantsForExperiment(experimentUid, list);
        } catch (error) {
          alert(error.message || "恢复失败");
        }
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
  slotWrap.dataset.experimentUid = exp.experiment_uid;
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
  const targetCard = container.querySelector(`.experiment-card[data-experiment-uid="${exp.experiment_uid}"]`);
  if (targetCard?.nextSibling) {
    container.insertBefore(slotWrap, targetCard.nextSibling);
  } else if (targetCard?.parentNode) {
    targetCard.parentNode.appendChild(slotWrap);
  } else {
    container.appendChild(slotWrap);
  }
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

function formatCompactDateTime(value) {
  if (!value || value === "-") return "-";
  const raw = String(value).trim();
  if (!raw) return "-";
  const directIso = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  if (directIso?.[1]) {
    return directIso[1];
  }
  const directSpace = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  if (directSpace?.[1] && directSpace?.[2]) {
    return `${directSpace[1]}T${directSpace[2]}`;
  }
  const parsed = Date.parse(raw.replace(" ", "T"));
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
  }
  return raw
    .replace(/\+\d{2}:\d{2}$/i, "")
    .replace(/Z$/i, "")
    .replace(/\.\d+$/, "")
    .slice(0, 19);
}

function formatRewardWithUnit(value) {
  const text = String(value ?? "").trim();
  if (!text) return "报酬：约-";
  return /元\s*$/u.test(text) ? `报酬：约${text}` : `报酬：约${text}元`;
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
      device_fingerprint: getOrCreateDeviceFingerprint(),
    };
    const data = await apiRequest("/experiments/apply", { method: "POST", json: payload });
    if (data.location === "在线" && (data.access_url || data.location_link)) {
      const link = data.access_url || data.location_link;
      let deviceOk = data.device_allowed;
      if (deviceOk === undefined && data.access_control_mode !== "none") {
        try {
          const check = await apiRequest("/experiments/access-check", {
            method: "POST",
            json: { experiment_uid: exp.experiment_uid },
          });
          deviceOk = check.device_ok;
        } catch (error) {
          deviceOk = true;
        }
      }
      if (data.access_control_mode !== "none" && deviceOk === false) {
        const message = "报名成功，但当前设备不符合要求。链接已准备，请在符合要求的设备上打开。";
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(link);
          setStatus(experimentStatus, `${message} 已复制链接到剪贴板。`);
        } else {
          window.prompt("复制并在合适设备打开", link);
          setStatus(experimentStatus, message);
        }
      } else {
        setStatus(experimentStatus, "报名成功，正在跳转实验链接...");
        window.open(link, "_blank");
      }
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

async function downloadParticipantsCsv(experimentUid) {
  const encoded = encodeURIComponent(experimentUid);
  const endpoints = [
    `/admin/experiment/participants/export?experiment_uid=${encoded}`,
    `/admin/experiment/participants/download?experiment_uid=${encoded}`,
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      await downloadApiFile(endpoint, `${experimentUid}_participants.csv`);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("下载失败");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => toggleTab(tab.dataset.tab));
});

profileToggle?.addEventListener("click", () => {
  const collapsed = profilePane.classList.contains("collapsed");
  setProfilePaneCollapsed(!collapsed);
});

changePasswordBtn?.addEventListener("click", () => {
  const isRoot = state.role === "root";
  rootPasswordSection?.classList.toggle("hidden", !isRoot);
  if (!isRoot && rootPasswordSection) {
    rootPasswordSection.querySelectorAll("input").forEach((input) => {
      input.value = "";
    });
  }
  passwordPanel.classList.toggle("hidden");
});

rootGrantToggleBtn?.addEventListener("click", () => {
  if (state.role !== "root") return;
  rootGrantPanel?.classList.toggle("hidden");
});

rootGrantPanelClose?.addEventListener("click", () => {
  rootGrantPanel?.classList.add("hidden");
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

majorInput?.addEventListener("input", (event) => {
  renderMajorSuggestions(event.target.value);
});

majorInput?.addEventListener("focus", (event) => {
  renderMajorSuggestions(event.target.value);
});

majorInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    addMajor(majorInput.value);
    majorInput.value = "";
  }
});

document.addEventListener("click", (event) => {
  if (!unitSuggestions || !unitInput) return;
  if (!unitSuggestions.contains(event.target) && event.target !== unitInput) {
    unitSuggestions.classList.remove("active");
  }
});

document.addEventListener("click", (event) => {
  if (!majorSuggestions || !majorInput) return;
  const inSuggestions = majorSuggestions.contains(event.target);
  const inInput = event.target === majorInput;
  const inTags = majorTags?.contains(event.target);
  if (!inSuggestions && !inInput && !inTags) {
    majorSuggestions.classList.remove("active");
  }
});

adminExperimentsRefresh?.addEventListener("click", async () => {
  await loadAdminExperimentList();
});

uploadZone?.addEventListener("click", () => {
  uploadFolderInput?.click();
});

uploadZone?.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadZone.classList.add("dragging");
});

uploadZone?.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragging");
});

uploadZone?.addEventListener("drop", async (event) => {
  event.preventDefault();
  uploadZone.classList.remove("dragging");
  const files = await getFilesFromDrop(event);
  await handleUploadSelection(files);
});

uploadFolderInput?.addEventListener("change", async (event) => {
  await handleUploadSelection(event.target?.files);
});

uploadTabs?.querySelectorAll(".mini-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const mode = tab.dataset.uploadTab || "link";
    setUploadMode(mode);
  });
});


locationSelect?.addEventListener("change", () => {
  const isOnline = locationSelect.value === "在线";
  uploadTabs?.classList.toggle("hidden", !isOnline);
  if (!isOnline) {
    resetUploadState();
    setHostedLinkMode(false);
  }
  if (isOnline) {
    setUploadMode(uploadState.mode || "link");
  } else {
    uploadPanelLink?.classList.add("hidden");
    uploadPanelUpload?.classList.add("hidden");
    uploadPanelGithub?.classList.add("hidden");
  }
  const isCustom = locationSelect.value === "其他";
  locationCustomField?.classList.toggle("hidden", !isCustom);
  accessControlModeField?.classList.toggle("hidden", !isOnline);
  if (!isOnline && accessControlMode) {
    accessControlMode.value = "none";
  }
  updateAccessControlHint(accessControlMode, accessControlHint);
  updateTokenScriptHelp();
  syncAdminHelpCardHeight();
});
accessControlMode?.addEventListener("change", () => {
  updateAccessControlHint(accessControlMode, accessControlHint);
  updateTokenScriptHelp();
});

scheduleRequired?.addEventListener("change", () => {
  scheduleEditor?.classList.toggle("hidden", scheduleRequired.value !== "yes");
  scheduleSlotsRequiredField?.classList.toggle("hidden", scheduleRequired.value !== "yes");
  syncAdminHelpCardHeight();
});

schedulePrev?.addEventListener("click", () => {
  const todayStart = normalizeStartDate(new Date(), scheduleState.dayCount);
  const next = new Date(scheduleState.weekStart);
  next.setDate(next.getDate() - getDayStep(scheduleState.dayCount));
  if (next < todayStart) return;
  scheduleState.weekStart = next;
  scheduleState.autoStart = false;
  renderScheduleGrid();
});

scheduleNext?.addEventListener("click", () => {
  const next = new Date(scheduleState.weekStart);
  next.setDate(next.getDate() + getDayStep(scheduleState.dayCount));
  scheduleState.weekStart = next;
  scheduleState.autoStart = false;
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
    syncMajorsHidden();
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
    if (state.role !== "root") {
      delete payload.target_user_uid;
      delete payload.root_password;
    }
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

rootGrantForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.role !== "root") {
    setStatus(rootGrantStatus, "仅 root 可执行此操作", true);
    return;
  }
  const payload = toJsonForm(rootGrantForm);
  const action = payload.action === "revoke" ? "revoke" : "grant";
  const userUid = String(payload.user_uid || "").trim().toUpperCase();
  if (!/^U\d{6}$/.test(userUid)) {
    setStatus(rootGrantStatus, "被试ID格式应为 U000123", true);
    return;
  }
  setStatus(rootGrantStatus, "提交中...");
  try {
    await apiRequest(action === "grant" ? "/admin/create-admin" : "/admin/revoke-admin", {
      method: "POST",
      json: { user_uid: userUid },
    });
    setStatus(rootGrantStatus, action === "grant"
      ? `已将 ${userUid} 设为主试`
      : `已将 ${userUid} 恢复为被试`);
    rootGrantForm.reset();
  } catch (error) {
    setStatus(rootGrantStatus, error.message, true);
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

    const useHostedUpload = uploadState.mode === "upload";
    const useGithubRepo = uploadState.mode === "github";
    const hasHostedUpload = uploadState.files.length > 0;
    if (location === "在线") {
      if (useHostedUpload) {
        if (!hasHostedUpload && !uploadState.prefix) {
          setStatus(adminExperimentStatus, "请先上传实验文件夹", true);
          return;
        }
        if (!uploadState.ready || !uploadState.prefix) {
          setStatus(adminExperimentStatus, "上传尚未完成", true);
          return;
        }
        if (!uploadState.hasIndex) {
          setStatus(adminExperimentStatus, "缺少 index.html，无法发布", true);
          return;
        }
      } else if (useGithubRepo) {
        const repo = (payload.github_repo || "").trim();
        if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(repo)) {
          setStatus(adminExperimentStatus, "请填写有效的 GitHub 仓库地址", true);
          return;
        }
      } else if (!payload.location_link) {
        setStatus(adminExperimentStatus, "请填写实验链接或上传实验文件夹", true);
        return;
      }
    }

    const scheduleRequiredValue = payload.schedule_required === "yes";
    const schedulePayload = scheduleRequiredValue ? buildSchedulePayload() : [];
    const allowedDevices = getCheckedValues(adminExperimentForm, "allowed_devices");
    const accessMode = location === "在线" ? (payload.access_control_mode || "none") : "none";
    if ((useHostedUpload || useGithubRepo) && accessMode === "proxy") {
      setStatus(adminExperimentStatus, "在线上传/GitHub模式不支持代理模式", true);
      return;
    }
    const requestPayload = {
      contact_phone: payload.contact_phone,
      name: payload.name,
      type: payload.type,
      location,
      location_link: (useHostedUpload || useGithubRepo) ? "" : payload.location_link,
      description: payload.description,
      notes: payload.notes,
      duration_min: payload.duration_min,
      reward: payload.reward,
      schedule_required: scheduleRequiredValue,
      schedule_slots_required: scheduleRequiredValue ? payload.schedule_slots_required || "=1" : "=1",
      conditions_text: adminConditions.value,
      quotas_text: adminQuota.value,
      schedule_slots: schedulePayload,
      access_control_mode: accessMode,
      allowed_devices: allowedDevices,
      same_device_single_account: sameDeviceSingleAccount?.checked !== false,
      device_info: navigator.platform || "",
      browser_info: navigator.userAgent || "",
    };

    if (useHostedUpload) {
      requestPayload.hosted_prefix = uploadState.prefix;
      requestPayload.download_policy = downloadPolicy?.value || "upload_only";
    } else if (useGithubRepo) {
      requestPayload.github_repo = (payload.github_repo || "").trim();
      requestPayload.download_policy = downloadPolicy?.value || "upload_only";
    }

    const result = await apiRequest("/admin/experiment/create", {
      method: "POST",
      json: requestPayload,
    });

    setStatus(adminExperimentStatus, `发布成功，实验编号 ${result.experiment_uid}`);
    scheduleState.slots = [];
    adminExperimentForm.reset();
    resetUploadState();
    setUploadMode("link");
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
      setStatus(experimentStatus, formatSlotRequirementHint(exp.schedule_slots_required || "=1"), true);
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
    await loadProfile();
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

initTokenScriptHelp();
refreshAdminTabCopyHint();
setUploadMode(uploadState.mode);
if (locationSelect?.value !== "在线") {
  uploadTabs?.classList.add("hidden");
}

loadProfile();
loadUnits();
loadMajors();
renderScheduleGrid();
attachScheduleResizeObserver();
attachAdminHelpHeightObserver();
syncAdminHelpCardHeight();

if (window.matchMedia && window.matchMedia("(orientation: portrait)").matches) {
  setProfilePaneCollapsed(true);
}

scheduleEditor?.classList.toggle("hidden", scheduleRequired?.value !== "yes");
scheduleSlotsRequiredField?.classList.toggle("hidden", scheduleRequired?.value !== "yes");
locationSelect?.dispatchEvent(new Event("change"));
