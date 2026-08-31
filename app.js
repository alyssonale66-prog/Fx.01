/* ============================================================
   FX.01 — Versão Profissional Auditada & Criptografada
   ============================================================ */

"use strict";

const FX_VERSION = "1.1.0";
const STORAGE_KEY = "fx01_sec_data";
const DEVICE_KEY_SECRET = "FX_KEY_SALT_v1";

/* MAPA DE ÍCONES SVG PADRONIZADOS */
const CATEGORY_ICONS = {
  fixed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  reserve: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/></svg>`,
  medicine: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  leisure: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><rect width="20" height="12" x="2" y="6" rx="6"/></svg>`,
  phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>`,
  other: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>`,
  biometrics: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04C4.05 16.148 3 13.686 3 11c0-4.97 4.03-9 9-9s9 4.03 9 9c0 4.015-2.631 7.41-6.284 8.571M12 7v8m0 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>`
};

/* ÍCONES VETORIAIS DE VISIBILIDADE E SEGURANÇA */
const SVG_EYE_OPEN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const SVG_EYE_SLASH = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

function getCategoryIconSvg(cat) {
  if (cat && CATEGORY_ICONS[cat.icon]) return CATEGORY_ICONS[cat.icon];
  if (cat && CATEGORY_ICONS[cat.id]) return CATEGORY_ICONS[cat.id];
  return CATEGORY_ICONS.other;
}

const DEFAULT_CATEGORIES = [
  { id: "fixed", name: "Gasto Fixo", icon: "fixed", hasLimit: false, limit: null, protected: true },
  { id: "reserve", name: "Reserva", icon: "reserve", hasLimit: false, limit: null, protected: true, immutable: true },
  { id: "medicine", name: "Medicamentos", icon: "medicine", hasLimit: false, limit: null, protected: true },
  { id: "leisure", name: "Lazer", icon: "leisure", hasLimit: false, limit: null, protected: true },
  { id: "phone", name: "Celular", icon: "phone", hasLimit: false, limit: null, protected: true },
  { id: "other", name: "Outros", icon: "other", hasLimit: false, limit: null, protected: true }
];

const RECOVERY_QUESTIONS = [
  { value: "pet", label: "Qual era o nome do seu primeiro animal de estimação?" },
  { value: "city", label: "Em qual cidade você nasceu?" },
  { value: "school", label: "Qual era o nome da sua primeira escola?" },
  { value: "nickname", label: "Qual era seu apelido de infância?" },
  { value: "custom", label: "Outra pergunta" }
];

let state = null;
let currentCategoryId = null;
let currentEditingCategoryId = null;
let currentEditingExpenseId = null;
let currentSetupStep = 1;
let setupSalarySplit = null;
let setupCategories = [];
let setupRecoveryQuestionKey = "";
let settingsSalarySplit = null;
let categoryEditorHasLimit = false;
let selectedReserveOrigin = null;

let selectedExpenseOrigin = "salary";
let selectedEditExpenseOrigin = "salary";
let selectedEditExpenseCategory = "fixed";
let selectedCategoryIcon = "other";
let editingSetupCategoryIndex = null;
let setupLimitHasLimit = false;

let customConfirmCallback = null;

const $ = (id) => document.getElementById(id);

const screens = {
  setup: $("setup-screen"),
  lock: $("lock-screen"),
  main: $("main-screen"),
  settings: $("settings-screen")
};

/* CAMADA DE CRIPTOGRAFIA EM REPOUSO (WEB CRYPTO API - AES-GCM & SHA-256) */
async function getCryptoKey() {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(DEVICE_KEY_SECRET),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("FX_FINANCE_SALT_2026"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function hashString(str) {
  if (!str) return "";
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function encryptData(dataObj) {
  try {
    const key = await getCryptoKey();
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = enc.encode(JSON.stringify(dataObj));

    const encryptedContent = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );

    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedContent), iv.length);

    return btoa(String.fromCharCode.apply(null, combined));
  } catch (err) {
    console.error("Erro ao criptografar dados:", err);
    return null;
  }
}

async function decryptData(cipherBase64) {
  try {
    const key = await getCryptoKey();
    const binaryStr = atob(cipherBase64);
    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combined[i] = binaryStr.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedContent = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedContent));
  } catch (err) {
    console.error("Erro ao decriptografar dados:", err);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initInitialIcons();
  bindEvents();
  initNativeLifecycle();
  await loadApplication();
});

function initInitialIcons() {
  if ($("setup-password-eye")) $("setup-password-eye").innerHTML = SVG_EYE_OPEN;
  if ($("setup-password-confirm-eye")) $("setup-password-confirm-eye").innerHTML = SVG_EYE_OPEN;
  if ($("biometric-unlock-icon")) $("biometric-unlock-icon").innerHTML = CATEGORY_ICONS.biometrics;
}

function initNativeLifecycle() {
  const App = window.Capacitor?.Plugins?.App;
  if (!App) return;

  // Gerenciamento do botão físico "Voltar" do Android
  App.addListener("backButton", () => {
    const openModals = document.querySelectorAll(".modal:not(.hidden)");
    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1];
      topModal.classList.add("hidden");
      return;
    }

    if (!screens.settings.classList.contains("hidden")) {
      showScreen("main");
      return;
    }

    if (!screens.main.classList.contains("hidden")) {
      lockApp();
      return;
    }

    App.exitApp();
  });

  // Bloqueio automático e autenticação ao minimizar / retornar do background
  App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      if (state && state.setupCompleted && !state.security.locked) {
        lockApp();
      }
    } else {
      if (state && state.security && state.security.locked && state.security.biometricId) {
        setTimeout(() => { authenticateBiometric(); }, 250);
      }
    }
  });
}

async function saveState() {
  if (!state) return;
  try {
    const encrypted = await encryptData(state);
    if (encrypted) {
      localStorage.setItem(STORAGE_KEY, encrypted);
    }
  } catch (e) {
    console.error("Erro ao salvar dados no LocalStorage:", e);
  }
}

async function loadApplication() {
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("fx01_data");
  if (!stored) {
    startInitialSetup();
    return;
  }

  try {
    let parsed = null;
    if (stored.startsWith("{")) {
      parsed = JSON.parse(stored);
    } else {
      parsed = await decryptData(stored);
    }

    if (parsed && typeof parsed === "object") {
      state = parsed;
    } else {
      state = createEmptyState();
    }
  } catch (error) {
    console.error("Erro ao ler dados corrompidos:", error);
    state = createEmptyState();
  }

  normalizeState();
  applyPersonalization();
  checkCycleRollover();
  checkCycleNotification();

  if (!state.setupCompleted) {
    startInitialSetup();
    return;
  }

  if (state.security && state.security.locked) {
    lockApp();
    return;
  }

  showScreen("main");
  renderApplication();
}

function normalizeState() {
  if (!state || typeof state !== "object") {
    state = createEmptyState();
    return;
  }
  if (!state.user || typeof state.user !== "object") state.user = { username: "", fullName: "", displayName: "", name: "" };
  if (typeof state.user.username !== "string") state.user.username = "";
  if (typeof state.user.fullName !== "string") state.user.fullName = "";
  if (typeof state.user.displayName !== "string") state.user.displayName = "";
  if (typeof state.user.name !== "string") state.user.name = "";
  if (!state.user.displayName && state.user.name) state.user.displayName = state.user.name;
  if (!state.user.name && state.user.displayName) state.user.name = state.user.displayName;
  
  if (!Array.isArray(state.categories)) state.categories = [];
  if (!Array.isArray(state.cycles)) state.cycles = [];
  if (!state.currentCycle) state.currentCycle = null;

  if (!state.reserve) state.reserve = { balance: 0 };
  state.reserve.balance = roundMoney(state.reserve.balance || 0);

  if (!state.salary) state.salary = { reference: 0, hasAdvance: false, advanceAmount: 0, advanceDay: 20 };
  state.salary.reference = roundMoney(state.salary.reference || 0);
  state.salary.advanceAmount = roundMoney(state.salary.advanceAmount || 0);
  if (typeof state.salary.hasAdvance !== "boolean") state.salary.hasAdvance = false;

  if (!state.extra) state.extra = { balance: 0 };
  state.extra.balance = roundMoney(state.extra.balance || 0);

  if (!state.security) state.security = { passwordHash: "", locked: false, lastCycleNotificationDate: "", biometricId: null, biometricType: null, recoveryQuestion: "", recoveryAnswerHash: "" };
  if (!state.settings) state.settings = { cycleDay: 5, hideBalances: false, appearance: "dark", theme: "fx" };

  normalizeCycle(state.currentCycle);
  state.cycles.forEach(normalizeCycle);
}

function normalizeCycle(cycle) {
  if (!cycle) return;
  if (!Array.isArray(cycle.expenses)) cycle.expenses = [];
  if (!Array.isArray(cycle.transfers)) cycle.transfers = [];
  if (!cycle.categoryUsage) cycle.categoryUsage = {};

  cycle.salaryReceived = roundMoney(cycle.salaryReceived || 0);
  cycle.leftoverSalary = roundMoney(cycle.leftoverSalary || 0);

  if (state && Array.isArray(state.categories)) {
    state.categories.forEach((cat) => {
      let total = 0;
      cycle.expenses.forEach((exp) => {
        if (exp.categoryId === cat.id) total += Number(exp.amount) || 0;
      });
      cycle.categoryUsage[cat.id] = roundMoney(total);
    });
  }
}

function createEmptyState() {
  return {
    version: FX_VERSION,
    setupCompleted: false,
    user: { username: "", fullName: "", displayName: "", name: "" },
    security: { passwordHash: "", locked: false, lastCycleNotificationDate: "", biometricId: null, biometricType: null, recoveryQuestion: "", recoveryAnswerHash: "" },
    salary: { reference: 0, hasAdvance: false, advanceAmount: 0, advanceDay: 20 },
    extra: { balance: 0 },
    reserve: { balance: 0 },
    settings: { cycleDay: 5, hideBalances: false, appearance: "dark", theme: "fx" },
    categories: [],
    cycles: [],
    currentCycle: null
  };
}

function checkCycleNotification() {
  if (!state || !state.currentCycle || !state.currentCycle.endDate) return;
  if (!("Notification" in window)) return;

  const now = new Date();
  const endDate = new Date(state.currentCycle.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays <= 3) {
    const todayStr = now.toISOString().slice(0, 10);
    if (state.security.lastCycleNotificationDate !== todayStr) {
      if (Notification.permission === "granted") {
        new Notification("FX — Fechamento de Ciclo", {
          body: `Seu ciclo financeiro encerra em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}.`
        });
        state.security.lastCycleNotificationDate = todayStr;
        saveState();
      }
    }
  }
}

function checkCycleRollover() {
  if (!state || !state.currentCycle || !state.currentCycle.endDate) return;

  let now = new Date();
  let endDate = new Date(state.currentCycle.endDate);

  while (now >= endDate) {
    const leftoverSalary = getSalaryBalance();
    if (leftoverSalary > 0) {
      state.extra.balance = roundMoney(state.extra.balance + leftoverSalary);
    }

    state.cycles.push(JSON.parse(JSON.stringify(state.currentCycle)));

    const cycleDay = state.settings.cycleDay || 5;
    const newStart = new Date(endDate);
    const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, cycleDay);

    state.currentCycle = {
      id: createId(),
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
      salaryReceived: roundMoney(state.salary.reference),
      leftoverSalary: 0,
      expenses: [],
      transfers: [],
      categoryUsage: {}
    };

    normalizeCycle(state.currentCycle);
    endDate = new Date(state.currentCycle.endDate);
  }

  saveState();
}

function startInitialSetup() {
  state = createEmptyState();
  setupCategories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  currentSetupStep = 1;
  setupSalarySplit = null;
  setupRecoveryQuestionKey = "";
  showScreen("setup");
  applyPersonalization();
  renderSetupStep();
}

function renderSetupStep() {
  document.querySelectorAll(".setup-step").forEach((step) => {
    const stepNumber = Number(step.dataset.step);
    step.classList.toggle("hidden", stepNumber !== currentSetupStep);
  });

  if (currentSetupStep === 6) renderSetupCategories();

  const total = 7;
  const button = $("setup-next-button");
  const back = $("setup-back-button");
  if (button) button.textContent = currentSetupStep === total ? "Concluir" : "Continuar";
  if (back) back.classList.toggle("hidden", currentSetupStep === 1);
  setText("setup-progress", `Etapa ${currentSetupStep} de ${total}`);
}

function renderSetupCategories() {
  const container = $("setup-categories");
  if (!container) return;
  container.innerHTML = "";

  setupCategories.forEach((cat, index) => {
    const item = document.createElement("div");
    item.className = "settings-category-item";
    item.style.cursor = "pointer";
    item.setAttribute("data-setup-cat-index", index);

    const isBlocked = cat.id === "reserve" || cat.id === "other";
    const limitLabel = isBlocked ? "Sem limite (fixo)" : (cat.hasLimit && cat.limit ? `Limite: ${formatMoney(cat.limit)}` : "Sem limite (Toque para ajustar)");

    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="color:var(--accent); display:flex; align-items:center;">${getCategoryIconSvg(cat)}</div>
        <div class="settings-category-info">
          <div class="settings-category-name">${escapeHTML(cat.name)}</div>
          <div class="settings-category-limit" style="color:${isBlocked ? 'var(--text-muted)' : 'var(--accent)'}">${limitLabel}</div>
        </div>
      </div>
      ${!isBlocked ? `<span style="color:var(--text-secondary); font-size:12px;">Editar</span>` : ``}
    `;
    container.appendChild(item);
  });
}

function openSetupLimitModal(index) {
  const cat = setupCategories[index];
  if (!cat) return;

  if (cat.id === "reserve" || cat.id === "other") {
    customAlert("As categorias Reserva e Outros funcionam sem limite de teto.");
    return;
  }

  editingSetupCategoryIndex = index;
  $("setup-limit-title").textContent = `Limite: ${cat.name}`;

  setupLimitHasLimit = !!cat.hasLimit;
  $("setup-limit-val").value = cat.limit ? cat.limit.toFixed(2) : "";

  updateSetupLimitButtons();
  openModal("setup-limit-modal");
}

function updateSetupLimitButtons() {
  $("setup-limit-yes")?.classList.toggle("selected", setupLimitHasLimit);
  $("setup-limit-no")?.classList.toggle("selected", !setupLimitHasLimit);
  $("setup-limit-input-container")?.classList.toggle("hidden", !setupLimitHasLimit);
}

function saveSetupLimit() {
  if (editingSetupCategoryIndex === null) return;
  const cat = setupCategories[editingSetupCategoryIndex];
  if (!cat) return;

  if (setupLimitHasLimit) {
    const val = parseMoneyInput($("setup-limit-val").value);
    if (val <= 0) return customAlert("Informe um valor de limite válido.");
    cat.hasLimit = true;
    cat.limit = val;
  } else {
    cat.hasLimit = false;
    cat.limit = null;
  }

  closeModal("setup-limit-modal");
  renderSetupCategories();
}

async function handleSetupNext() {
  if (currentSetupStep === 1) {
    const username = $("setup-username")?.value.trim().toLowerCase();
    const password = $("setup-password")?.value || "";
    const confirm = $("setup-password-confirm")?.value || "";
    if (!username) return showSetupError("setup-credentials-error", "Digite um usuário.");
    if (!/^[a-z0-9_]{3,40}$/.test(username)) return showSetupError("setup-credentials-error", "Use de 3 a 40 caracteres com letras minúsculas, números ou '_'.");
    if (!password) return showSetupError("setup-credentials-error", "Crie uma senha.");
    
    // Regra de validação reforçada: Mínimo 8 caracteres, 1 maiúscula e 1 número
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      return showSetupError("setup-credentials-error", "A senha precisa ter no mínimo 8 caracteres, com ao menos 1 letra MAIÚSCULA e 1 número.");
    }
    
    if (password !== confirm) return showSetupError("setup-credentials-error", "As senhas não coincidem.");
    state.user.username = username;
    state.security.passwordHash = await hashString(password);
    hideElement("setup-credentials-error");
  }

  if (currentSetupStep === 2) {
    const fullName = $("setup-full-name")?.value.trim();
    const displayName = $("setup-display-name")?.value.trim();
    if (!fullName) return showSetupError("setup-personal-error", "Digite seu nome completo.");
    if (!displayName) return showSetupError("setup-personal-error", "Digite como gostaria de ser chamado.");
    state.user.fullName = fullName;
    state.user.displayName = displayName;
    state.user.name = displayName;
    hideElement("setup-personal-error");
  }

  if (currentSetupStep === 3) {
    const val = parseMoneyInput($("setup-salary")?.value);
    if (val < 0) return customAlert("O salário não pode ser negativo.");
    state.salary.reference = val;
  }

  if (currentSetupStep === 4) {
    if (!setupSalarySplit) return customAlert("Escolha uma opção.");
    state.salary.hasAdvance = setupSalarySplit === "yes";
    if (state.salary.hasAdvance) {
      const advVal = parseMoneyInput($("setup-advance-val")?.value);
      if (advVal <= 0) return customAlert("Informe um valor válido para o adiantamento.");
      if (advVal > state.salary.reference) return customAlert("O adiantamento não pode ser maior que o salário.");
      state.salary.advanceAmount = advVal;
    } else state.salary.advanceAmount = 0;
  }

  if (currentSetupStep === 5) {
    const day = Number($("setup-cycle-day")?.value);
    if (!Number.isInteger(day) || day < 1 || day > 28) return customAlert("Dia entre 1 e 28.");
    state.settings.cycleDay = day;
  }

  if (currentSetupStep === 7) {
    const answer = $("setup-recovery-answer")?.value.trim();
    let question = setupRecoveryQuestionKey;
    if (setupRecoveryQuestionKey === "custom") {
      question = $("setup-custom-question")?.value.trim();
    } else {
      const found = RECOVERY_QUESTIONS.find(q => q.value === setupRecoveryQuestionKey);
      if (found) question = found.label;
    }

    const errorId = "setup-recovery-error";
    if (!setupRecoveryQuestionKey) return showSetupError(errorId, "Selecione uma pergunta de recuperação.");
    if (setupRecoveryQuestionKey === "custom" && !question) return showSetupError(errorId, "Digite sua pergunta.");
    if (!answer) return showSetupError(errorId, "Digite a resposta de recuperação.");
    
    state.security.recoveryQuestion = question;
    state.security.recoveryAnswerHash = await hashString(answer);
    hideElement(errorId);
  }

  if (currentSetupStep < 7) {
    currentSetupStep++;
    renderSetupStep();
    return;
  }

  await completeInitialSetup();
}

function showSetupError(id, message) {
  showElement(id, message);
}

async function completeInitialSetup() {
  state.categories = setupCategories.map((c) => ({ ...c }));
  state.user.name = state.user.displayName || state.user.name;
  state.setupCompleted = true;
  state.security.locked = false;

  createInitialCycle();
  await saveState();
  showScreen("main");
  renderApplication();
}

function createInitialCycle() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), state.settings.cycleDay);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, state.settings.cycleDay);

  state.currentCycle = {
    id: createId(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    salaryReceived: roundMoney(state.salary.reference),
    leftoverSalary: 0,
    expenses: [],
    transfers: [],
    categoryUsage: {}
  };

  normalizeCycle(state.currentCycle);
}

function getSalaryBalance() {
  if (!state || !state.currentCycle) return 0;
  let balance = Number(state.currentCycle.salaryReceived) || 0;

  state.currentCycle.expenses.forEach((exp) => {
    if (exp.origin === "salary") balance -= Number(exp.amount) || 0;
  });

  state.currentCycle.transfers.forEach((tr) => {
    if (tr.origin === "salary") balance -= Number(tr.amount) || 0;
  });

  return roundMoney(Math.max(0, balance));
}

function getExtraBalance() {
  return roundMoney(Math.max(0, Number(state.extra?.balance) || 0));
}

function getReserveBalance() {
  return roundMoney(Math.max(0, Number(state.reserve?.balance) || 0));
}

function launchExpense(categoryId, amount, origin, description) {
  if (categoryId === "reserve") {
    openReserveModal();
    return;
  }

  amount = roundMoney(amount);
  if (amount <= 0) throw new Error("O valor deve ser maior que zero.");

  const cat = state.categories.find((c) => c.id === categoryId);
  if (cat && cat.hasLimit && cat.limit && cat.limit > 0) {
    const currentUsage = state.currentCycle.categoryUsage[categoryId] || 0;
    if (roundMoney(currentUsage + amount) > cat.limit) {
      throw new Error(`Este valor excede o limite da categoria (${formatMoney(cat.limit)}).`);
    }
  }

  const available = origin === "salary" ? getSalaryBalance() : getExtraBalance();
  if (amount > available) throw new Error("Saldo insuficiente na origem selecionada.");

  if (origin === "extra") {
    state.extra.balance = roundMoney(state.extra.balance - amount);
  }

  const expense = {
    id: createId(),
    origin,
    amount,
    description: description || "",
    categoryId,
    date: new Date().toISOString()
  };

  state.currentCycle.expenses.push(expense);
  normalizeCycle(state.currentCycle);

  saveState();
  if (document.activeElement) document.activeElement.blur();
  renderApplication();
}

function openEditExpenseModal(expenseId) {
  const expense = state.currentCycle.expenses.find((e) => e.id === expenseId);
  if (!expense) return;

  currentEditingExpenseId = expenseId;

  $("edit-expense-value").value = expense.amount.toFixed(2);
  $("edit-expense-description").value = expense.description || "";

  selectedEditExpenseOrigin = expense.origin;
  selectedEditExpenseCategory = expense.categoryId;

  updateCustomSelectTriggers();
  hideElement("edit-expense-error");
  openModal("expense-edit-modal");
}

function saveExpenseEdit() {
  try {
    const expense = state.currentCycle.expenses.find((e) => e.id === currentEditingExpenseId);
    if (!expense) throw new Error("Gasto não encontrado.");

    const newAmount = parseMoneyInput($("edit-expense-value").value);
    const newOrigin = selectedEditExpenseOrigin;
    const newCategory = selectedEditExpenseCategory;
    const newDesc = $("edit-expense-description").value.trim();

    if (newAmount <= 0) throw new Error("O valor deve ser maior que zero.");

    const targetCat = state.categories.find((c) => c.id === newCategory);
    if (targetCat && targetCat.hasLimit && targetCat.limit && targetCat.limit > 0) {
      let currentUsage = state.currentCycle.categoryUsage[newCategory] || 0;
      if (expense.categoryId === newCategory) {
        currentUsage -= expense.amount;
      }
      if (roundMoney(currentUsage + newAmount) > targetCat.limit) {
        throw new Error(`Este valor excede o limite da categoria (${formatMoney(targetCat.limit)}).`);
      }
    }

    const oldAmount = expense.amount;
    const oldOrigin = expense.origin;

    if (oldOrigin === "extra") state.extra.balance = roundMoney(state.extra.balance + oldAmount);
    if (oldOrigin === "reserve") state.reserve.balance = roundMoney(state.reserve.balance + oldAmount);

    if (newOrigin === "extra") {
      if (newAmount > getExtraBalance()) {
        if (oldOrigin === "extra") state.extra.balance = roundMoney(state.extra.balance - oldAmount);
        if (oldOrigin === "reserve") state.reserve.balance = roundMoney(state.reserve.balance - oldAmount);
        throw new Error("Saldo insuficiente no Extra.");
      }
      state.extra.balance = roundMoney(state.extra.balance - newAmount);
    } else if (newOrigin === "reserve") {
      if (newAmount > getReserveBalance()) {
        if (oldOrigin === "extra") state.extra.balance = roundMoney(state.extra.balance - oldAmount);
        if (oldOrigin === "reserve") state.reserve.balance = roundMoney(state.reserve.balance - oldAmount);
        throw new Error("Saldo insuficiente na Reserva.");
      }
      state.reserve.balance = roundMoney(state.reserve.balance - newAmount);
    } else if (newOrigin === "salary") {
      expense.amount = 0;
      if (newAmount > getSalaryBalance()) {
        expense.amount = oldAmount;
        if (oldOrigin === "extra") state.extra.balance = roundMoney(state.extra.balance - oldAmount);
        if (oldOrigin === "reserve") state.reserve.balance = roundMoney(state.reserve.balance - oldAmount);
        throw new Error("Saldo insuficiente no Salário.");
      }
    }

    expense.amount = newAmount;
    expense.origin = newOrigin;
    expense.categoryId = newCategory;
    expense.description = newDesc;

    normalizeCycle(state.currentCycle);
    saveState();
    closeModal("expense-edit-modal");
    if (document.activeElement) document.activeElement.blur();
    renderApplication();
  } catch (err) {
    showElement("edit-expense-error", err.message);
  }
}

function deleteExpense() {
  if (!currentEditingExpenseId) return;

  customConfirm("Tem certeza que deseja excluir este gasto?", () => {
    const index = state.currentCycle.expenses.findIndex((e) => e.id === currentEditingExpenseId);
    if (index === -1) return;

    const expense = state.currentCycle.expenses[index];

    if (expense.origin === "extra") {
      state.extra.balance = roundMoney(state.extra.balance + expense.amount);
    } else if (expense.origin === "reserve") {
      state.reserve.balance = roundMoney(state.reserve.balance + expense.amount);
    }

    state.currentCycle.expenses.splice(index, 1);
    normalizeCycle(state.currentCycle);

    saveState();
    closeModal("expense-edit-modal");
    if (document.activeElement) document.activeElement.blur();
    renderApplication();
  });
}

function openCategoryDetails(categoryId) {
  const category = state.categories.find((c) => c.id === categoryId);
  if (!category) return;

  if (category.id === "reserve") {
    openReserveModal();
    return;
  }

  const container = $("category-details");
  if (!container) return;

  const expenses = (state.currentCycle?.expenses || [])
    .filter((e) => e.categoryId === categoryId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const usage = state.currentCycle.categoryUsage[categoryId] || 0;

  let html = `
    <div style="text-align:center; padding-bottom:12px;">
      <div style="display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:50%; background:var(--surface-3); color:var(--accent); margin-bottom:8px;">
        ${getCategoryIconSvg(category)}
      </div>
      <h3 style="font-size:20px; font-weight:800;">${escapeHTML(category.name)}</h3>
      <p style="color:var(--text-secondary); font-size:14px; margin-top:4px;">
        Total Lançado: <strong>${formatMoneyOrMask(usage)}</strong>
      </p>
    </div>
    <div class="expense-group-items">
  `;

  if (!expenses.length) {
    html += `<div style="padding:20px; text-align:center; color:var(--text-muted);">Nenhum gasto nesta categoria.</div>`;
  } else {
    expenses.forEach((exp) => {
      html += `
        <div class="expense-item-card" data-edit-expense-id="${exp.id}">
          <div class="expense-item-left">
            <div class="expense-item-details">
              <span class="expense-item-title">${escapeHTML(exp.description || category.name)}</span>
              <span class="expense-item-time">${new Date(exp.date).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
          <span class="expense-item-amount">${formatMoneyOrMask(exp.amount)}</span>
        </div>
      `;
    });
  }

  html += `</div>`;
  container.innerHTML = html;
  openModal("category-modal");
}

function openHistoryModal(cycleId = null) {
  const container = $("history-container");
  if (!container) return;

  if (!state.cycles || !state.cycles.length) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum histórico de ciclo anterior encontrado.</div>`;
    openModal("history-modal");
    return;
  }

  if (cycleId) {
    const cycle = state.cycles.find(c => c.id === cycleId);
    if (!cycle) return;
    const startStr = new Date(cycle.startDate).toLocaleDateString("pt-BR");
    const endStr = new Date(cycle.endDate).toLocaleDateString("pt-BR");
    const totalSpent = (cycle.expenses || []).reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

    let expensesHtml = "";
    if (!cycle.expenses || !cycle.expenses.length) {
      expensesHtml = `<div style="padding:15px; text-align:center; color:var(--text-muted);">Nenhum gasto registrado neste ciclo.</div>`;
    } else {
      cycle.expenses.forEach(exp => {
        const cat = state.categories.find(c => c.id === exp.categoryId);
        const catName = cat ? cat.name : "Outros";
        expensesHtml += `
          <div class="expense-item-card" style="cursor:default;">
            <div class="expense-item-left">
              <div class="expense-item-details">
                <span class="expense-item-title">${escapeHTML(exp.description || catName)}</span>
                <div class="expense-item-sub">
                  <span class="expense-origin-badge badge-reserve">${exp.origin}</span>
                  <span class="expense-item-time">${new Date(exp.date).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            </div>
            <span class="expense-item-amount">${formatMoneyOrMask(exp.amount)}</span>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <button type="button" class="secondary-button" style="margin-bottom:12px; min-height:36px;" data-back-to-history="true">← Voltar à lista de ciclos</button>
      <div style="font-weight:700; font-size:16px; color:var(--accent); margin-bottom:4px;">Ciclo (${startStr} até ${endStr})</div>
      <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">Total Gasto: <strong>${formatMoneyOrMask(totalSpent)}</strong></p>
      <div class="expense-group-items">${expensesHtml}</div>
    `;
    openModal("history-modal");
    return;
  }

  let html = `<div style="display:flex; flex-direction:column; gap:12px;">`;

  state.cycles.slice().reverse().forEach((cycle, idx) => {
    const startStr = new Date(cycle.startDate).toLocaleDateString("pt-BR");
    const endStr = new Date(cycle.endDate).toLocaleDateString("pt-BR");
    const totalSpent = (cycle.expenses || []).reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

    html += `
      <div style="padding:14px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-small); cursor:pointer;" data-history-cycle-id="${cycle.id}">
        <div style="font-weight:700; font-size:14px; color:var(--accent);">Ciclo ${state.cycles.length - idx} (${startStr} até ${endStr})</div>
        <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:13px; color:var(--text-secondary);">
          <span>Gastos Totais:</span>
          <strong style="color:var(--text);">${formatMoneyOrMask(totalSpent)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:2px; font-size:13px; color:var(--text-secondary);">
          <span>Lançamentos:</span>
          <strong>${(cycle.expenses || []).length} itens (Toque para ver detalhes)</strong>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
  openModal("history-modal");
}

function openReserveModal() {
  if ($("reserve-value")) $("reserve-value").value = "";
  if ($("withdraw-value")) $("withdraw-value").value = "";

  selectedReserveOrigin = "salary";
  hideElement("reserve-error");
  hideElement("reserve-form");
  hideElement("withdraw-form");
  hideElement("reserve-origin-section");

  updateReserveModalOriginButtons();
  setText("reserve-balance", formatMoneyOrMask(getReserveBalance()));

  openModal("reserve-modal");
}

function updateReserveModalOriginButtons() {
  const salaryBtn = $("reserve-origin-salary-btn");
  const extraBtn = $("reserve-origin-extra-btn");

  if (salaryBtn) salaryBtn.classList.toggle("selected", selectedReserveOrigin === "salary");
  if (extraBtn) extraBtn.classList.toggle("selected", selectedReserveOrigin === "extra");

  setText("reserve-salary-available", formatMoneyOrMask(getSalaryBalance()));
  setText("reserve-extra-available", formatMoneyOrMask(getExtraBalance()));
}

function showReserveSaveForm() {
  hideElement("withdraw-form");
  showElement("reserve-form");
  showElement("reserve-origin-section");
  updateReserveModalOriginButtons();
}

function showWithdrawForm() {
  hideElement("reserve-form");
  hideElement("reserve-origin-section");
  showElement("withdraw-form");
}

function confirmReserveSave() {
  try {
    if (!selectedReserveOrigin) throw new Error("Selecione de onde retirar o dinheiro.");
    const amount = parseMoneyInput($("reserve-value")?.value);
    if (amount <= 0) throw new Error("Valor deve ser maior que zero.");

    const available = selectedReserveOrigin === "salary" ? getSalaryBalance() : getExtraBalance();
    if (amount > available) throw new Error("Saldo insuficiente na origem.");

    if (selectedReserveOrigin === "extra") {
      state.extra.balance = roundMoney(state.extra.balance - amount);
    }

    state.currentCycle.transfers.push({
      id: createId(),
      origin: selectedReserveOrigin,
      amount: amount,
      date: new Date().toISOString()
    });

    state.reserve.balance = roundMoney(state.reserve.balance + amount);
    saveState();
    closeModal("reserve-modal");
    if (document.activeElement) document.activeElement.blur();
    renderApplication();
  } catch (err) {
    showElement("reserve-error", err.message);
  }
}

function confirmReserveWithdraw() {
  try {
    const amount = parseMoneyInput($("withdraw-value")?.value);
    if (amount <= 0) throw new Error("Valor deve ser maior que zero.");
    if (amount > getReserveBalance()) throw new Error("Saldo insuficiente na Reserva.");

    state.reserve.balance = roundMoney(state.reserve.balance - amount);

    const expense = {
      id: createId(),
      origin: "reserve",
      amount: amount,
      description: "Retirada da Reserva",
      categoryId: "other",
      date: new Date().toISOString()
    };

    state.currentCycle.expenses.push(expense);
    normalizeCycle(state.currentCycle);

    saveState();
    closeModal("reserve-modal");
    if (document.activeElement) document.activeElement.blur();
    renderApplication();
  } catch (err) {
    showElement("reserve-error", err.message);
  }
}

async function exportBackup() {
  try {
    const jsonStr = JSON.stringify(state, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `fx_backup_${dateStr}.json`;
    const file = new File([jsonStr], fileName, { type: "application/json" });

    let canShare = false;
    try {
      canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (e) {
      canShare = false;
    }

    if (canShare) {
      await navigator.share({
        files: [file],
        title: "Backup FX",
        text: "Seu arquivo de backup do FX"
      });
      return;
    }

    const encodedData = "data:application/json;charset=utf-8," + encodeURIComponent(jsonStr);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = encodedData;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    if (err.name !== "AbortError") {
      customAlert("Erro ao exportar backup: " + err.message);
    }
  }
}

async function exportCSV() {
  try {
    const expenses = state.currentCycle?.expenses || [];
    if (!expenses.length) {
      return customAlert("Não há lançamentos no ciclo ativo para exportar.");
    }

    let csvContent = "\uFEFFData;Categoria;Origem;Descrição;Valor (R$)\n";

    expenses.forEach((exp) => {
      const cat = state.categories.find((c) => c.id === exp.categoryId);
      const catName = cat ? cat.name : "Outros";
      const dateStr = new Date(exp.date).toLocaleDateString("pt-BR");
      const originStr = exp.origin === "salary" ? "Salário" : exp.origin === "extra" ? "Extra" : "Reserva";
      const descStr = (exp.description || catName).replace(/;/g, ",");
      const valStr = exp.amount.toFixed(2).replace(".", ",");

      csvContent += `${dateStr};"${catName}";${originStr};"${descStr}";${valStr}\n`;
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `fx_extrato_${dateStr}.csv`;
    const file = new File([csvContent], fileName, { type: "text/csv" });

    let canShare = false;
    try {
      canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (e) {
      canShare = false;
    }

    if (canShare) {
      await navigator.share({
        files: [file],
        title: "Extrato FX",
        text: "Seu extrato em CSV"
      });
      return;
    }

    const encodedData = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = encodedData;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    if (err.name !== "AbortError") {
      customAlert("Erro ao exportar planilha CSV: " + err.message);
    }
  }
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importedState = JSON.parse(e.target.result);
      if (!importedState || typeof importedState !== "object" || !importedState.version) {
        throw new Error("Arquivo de backup inválido ou incompatível.");
      }

      state = importedState;
      normalizeState();
      await saveState();
      renderApplication();
      customAlert("Backup importado com sucesso!");
    } catch (err) {
      customAlert("Erro ao importar backup: " + err.message);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

/* INTEGRAÇÃO NATIVA DE BIOMETRIA */
function getBiometricPlugin() {
  return window.Capacitor?.Plugins?.NativeBiometric;
}

async function checkBiometricSupport() {
  const plugin = getBiometricPlugin();
  if (plugin) {
    try {
      const result = await plugin.isAvailable();
      return { type: "capacitor", available: !!(result && result.isAvailable) };
    } catch {
      return { type: "none", available: false };
    }
  }
  return { type: "none", available: false };
}

async function registerBiometrics() {
  const support = await checkBiometricSupport();

  if (!support.available) {
    return customAlert("Seu dispositivo não possui sensor de biometria ativo nas configurações do sistema.");
  }

  const plugin = getBiometricPlugin();
  try {
    await plugin.verifyIdentity({
      reason: "Cadastrar e testar a biometria no FX",
      title: "Biometria FX",
      subtitle: "Confirme sua digital ou face"
    });
    state.security.biometricId = "enabled";
    state.security.biometricType = "capacitor";
    await saveState();
    customAlert("Biometria cadastrada com sucesso! Ela será solicitada automaticamente na abertura do app.");
  } catch (err) {
    customAlert("Não foi possível confirmar a biometria: " + (err.message || "Cancelado."));
  }
}

async function authenticateBiometric() {
  if (!state || !state.security || !state.security.biometricId) return;

  const plugin = getBiometricPlugin();
  if (plugin) {
    try {
      await plugin.verifyIdentity({
        reason: "Acesse sua conta FX",
        title: "Desbloqueio FX",
        subtitle: "Confirme sua digital ou face"
      });
      unlockSuccess();
    } catch (err) {
      showElement("unlock-error", "Biometria não reconhecida ou cancelada. Use sua senha.");
    }
  } else {
    showElement("unlock-error", "Biometria indisponível. Use sua senha.");
  }
}

function unlockSuccess() {
  state.security.locked = false;
  saveState();
  showScreen("main");
  renderApplication();
}

function updateCustomSelectTriggers() {
  const editExpOriginBtn = $("edit-expense-origin-trigger");
  if (editExpOriginBtn) {
    if (selectedEditExpenseOrigin === "salary") editExpOriginBtn.textContent = "Salário";
    else if (selectedEditExpenseOrigin === "extra") editExpOriginBtn.textContent = "Extra";
    else editExpOriginBtn.textContent = "Reserva";
  }

  const editExpCatBtn = $("edit-expense-category-trigger");
  if (editExpCatBtn) {
    const cat = state.categories.find(c => c.id === selectedEditExpenseCategory);
    editExpCatBtn.textContent = cat ? cat.name : "Selecione";
  }

  const catIconBtn = $("category-icon-trigger");
  if (catIconBtn) {
    const labels = {
      fixed: "Gasto Fixo (Casa)",
      reserve: "Reserva (Cofre)",
      medicine: "Medicamentos (Remédio)",
      leisure: "Lazer (Controle)",
      phone: "Celular (Smartphone)",
      other: "Outros (Caixa)"
    };
    catIconBtn.textContent = labels[selectedCategoryIcon] || "Outros";
  }

  const recQuestBtn = $("setup-recovery-question-trigger");
  if (recQuestBtn) {
    const found = RECOVERY_QUESTIONS.find(q => q.value === setupRecoveryQuestionKey);
    recQuestBtn.textContent = found ? found.label : "Selecione uma pergunta";
  }
}

function openCustomPicker(title, options, onSelect) {
  $("picker-title").textContent = title;
  const container = $("picker-options");
  container.innerHTML = "";

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "picker-option-button";
    btn.innerHTML = `<span>${escapeHTML(opt.label)}</span>${opt.selected ? '<span style="color:var(--accent)">✓</span>' : ''}`;
    btn.onclick = () => {
      onSelect(opt.value);
      closeModal("picker-modal");
      updateCustomSelectTriggers();
    };
    container.appendChild(btn);
  });

  openModal("picker-modal");
}

function renderSettingsCategories() {
  const container = $("settings-categories-list");
  if (!container) return;
  container.innerHTML = "";

  state.categories.forEach((cat) => {
    const item = document.createElement("div");
    item.className = "settings-category-item";

    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="color:var(--accent); display:flex; align-items:center;">${getCategoryIconSvg(cat)}</div>
        <div class="settings-category-info">
          <div class="settings-category-name">${escapeHTML(cat.name)}</div>
          <div class="settings-category-limit">${cat.hasLimit && cat.limit ? `Limite: ${formatMoneyOrMask(cat.limit)}` : "Sem limite"}</div>
        </div>
      </div>
      <button type="button" class="secondary-button" style="width:auto; padding:6px 14px; min-height:34px; font-size:12px;" data-edit-category-id="${cat.id}">
        Editar
      </button>
    `;
    container.appendChild(item);
  });
}

function openCategoryEditorModal(catId = null) {
  currentEditingCategoryId = catId;
  hideElement("category-editor-error");

  if (catId) {
    const cat = state.categories.find((c) => c.id === catId);
    if (!cat) return;

    if ($("category-editor-title")) $("category-editor-title").textContent = "Editar Categoria";
    $("category-name").value = cat.name;
    selectedCategoryIcon = cat.icon || "other";

    categoryEditorHasLimit = !!cat.hasLimit;
    $("category-limit-value").value = cat.limit ? cat.limit.toFixed(2) : "";
  } else {
    if ($("category-editor-title")) $("category-editor-title").textContent = "Criar Categoria";
    $("category-name").value = "";
    selectedCategoryIcon = "other";
    categoryEditorHasLimit = false;
    $("category-limit-value").value = "";
  }

  document.querySelectorAll("[data-category-limit]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.categoryLimit === (categoryEditorHasLimit ? "yes" : "no"));
  });
  $("category-limit-value-container")?.classList.toggle("hidden", !categoryEditorHasLimit);

  updateCustomSelectTriggers();
  openModal("category-editor-modal");
}

function saveCategory() {
  try {
    const name = $("category-name").value.trim();
    const icon = selectedCategoryIcon || "other";
    const limitVal = parseMoneyInput($("category-limit-value").value);

    if (!name) throw new Error("Digite o nome da categoria.");

    // Validação de unicidade de nome para evitar duplicações de categorias
    const duplicate = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== currentEditingCategoryId);
    if (duplicate) throw new Error("Já existe uma categoria cadastrada com esse nome.");

    if (currentEditingCategoryId) {
      const cat = state.categories.find((c) => c.id === currentEditingCategoryId);
      if (cat) {
        if (cat.immutable) throw new Error("Esta categoria é protegida pelo sistema e não pode ser alterada.");
        cat.name = name;
        cat.icon = icon;
        if (!cat.protected) {
          if (categoryEditorHasLimit && limitVal <= 0) throw new Error("Informe um valor de limite válido.");
          cat.hasLimit = categoryEditorHasLimit;
          cat.limit = categoryEditorHasLimit ? limitVal : null;
        } else {
          cat.hasLimit = false;
          cat.limit = null;
        }
      }
    } else {
      if (categoryEditorHasLimit && limitVal <= 0) throw new Error("Informe um valor de limite válido.");
      const newCat = {
        id: createId(),
        name,
        icon,
        hasLimit: categoryEditorHasLimit,
        limit: categoryEditorHasLimit ? limitVal : null,
        protected: false
      };
      state.categories.push(newCat);
    }

    normalizeCycle(state.currentCycle);
    saveState();
    closeModal("category-editor-modal");
    if (document.activeElement) document.activeElement.blur();
    renderApplication();
  } catch (err) {
    showElement("category-editor-error", err.message);
  }
}

function openChartModal() {
  const container = $("chart-container");
  if (!container) return;

  const totals = state.categories
    .map((c) => ({ name: c.name, icon: getCategoryIconSvg(c), value: state.currentCycle.categoryUsage[c.id] || 0 }))
    .filter((c) => c.value > 0);

  const totalSum = totals.reduce((acc, curr) => acc + curr.value, 0);

  if (!totals.length || totalSum <= 0) {
    return customAlert("Ainda não existem gastos lançados no ciclo.");
  }

  let cursor = 0;
  const segments = totals.map((item, idx) => {
    const pct = (item.value / totalSum) * 100;
    const start = cursor;
    cursor += pct;
    const hue = Math.round((idx / totals.length) * 360);
    return { ...item, pct, start, end: cursor, color: `hsl(${hue} 70% 50%)` };
  });

  const gradient = segments.map((s) => `${s.color} ${s.start}% ${s.end}%`).join(", ");

  const legendHTML = segments
    .map(
      (s) => `
    <div class="pizza-legend-item">
      <span style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${s.color};"></span>
        ${escapeHTML(s.name)}
      </span>
      <strong>${formatMoneyOrMask(s.value)} (${s.pct.toFixed(1)}%)</strong>
    </div>
  `
    )
    .join("");

  container.innerHTML = `
    <div class="pizza-chart" style="background: conic-gradient(${gradient}); position:relative; margin: 0 auto;">
      <div style="position:absolute; inset:25%; background:var(--surface); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800;">
        ${formatMoneyOrMask(totalSum)}
      </div>
    </div>
    <div class="pizza-legend">${legendHTML}</div>
  `;

  openModal("chart-modal");
}

function applyPersonalization() {
  const appearance = state?.settings?.appearance || "dark";
  const theme = state?.settings?.theme || "fx";
  document.documentElement.dataset.appearance = appearance;
  document.documentElement.dataset.theme = theme;
  document.body?.setAttribute("data-appearance", appearance);
  document.body?.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = appearance;
}

function renderPersonalizationControls() {
  const appearance = state?.settings?.appearance || "dark";
  const theme = state?.settings?.theme || "fx";
  document.querySelectorAll("[data-appearance]").forEach((btn) => btn.classList.toggle("selected", btn.dataset.appearance === appearance));
  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.themeChoice === theme);
    btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === theme));
  });
}

function saveAppearance(value) {
  if (!["dark", "light"].includes(value)) return;
  state.settings.appearance = value;
  applyPersonalization();
  renderPersonalizationControls();
  saveState();
}

function saveTheme(value) {
  if (!["fx", "graphite", "emerald"].includes(value)) return;
  state.settings.theme = value;
  applyPersonalization();
  renderPersonalizationControls();
  saveState();
}

function saveProfileSettings() {
  const fullName = $("settings-full-name")?.value.trim();
  const displayName = $("settings-username")?.value.trim();
  if (!fullName) return customAlert("Digite seu nome completo.");
  if (!displayName) return customAlert("Digite como gostaria de ser chamado.");
  state.user.fullName = fullName;
  state.user.displayName = displayName;
  state.user.name = displayName;
  saveState();
  renderApplication();
  customAlert("Perfil salvo com sucesso.");
}

function saveSalarySettings() {
  const raw = $("settings-salary")?.value;
  const salary = parseMoneyInput(raw);

  if (salary < 0) return customAlert("Salário não pode ser negativo.");

  state.salary.reference = salary;
  state.salary.hasAdvance = settingsSalarySplit === "yes";

  if (state.salary.hasAdvance) {
    const advVal = parseMoneyInput($("settings-advance-val")?.value);
    state.salary.advanceAmount = advVal;
  } else {
    state.salary.advanceAmount = 0;
  }

  if (state.currentCycle) {
    state.currentCycle.salaryReceived = roundMoney(salary);
  }

  saveState();
  renderApplication();
  customAlert("Salário salvo com sucesso.");
}

function saveCycleSettings() {
  const newDay = Number($("settings-cycle-day")?.value);
  if (!Number.isInteger(newDay) || newDay < 1 || newDay > 28) return customAlert("Dia entre 1 e 28.");

  state.settings.cycleDay = newDay;
  saveState();
  customAlert("Alteração será aplicada no próximo ciclo.");
}

async function saveNewPassword() {
  const current = $("current-password")?.value;
  const newPass = $("new-password")?.value;
  const confirmPass = $("confirm-new-password")?.value;

  const currentHash = await hashString(current);
  if (state.security.passwordHash && currentHash !== state.security.passwordHash) {
    return showElement("password-error", "Senha atual incorreta.");
  }
  if (!newPass) return showElement("password-error", "Digite a nova senha.");
  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPass)) {
    return showElement("password-error", "Senha com mínimo de 8 caracteres, 1 maiúscula e 1 número.");
  }
  if (newPass !== confirmPass) return showElement("password-error", "Senhas não coincidem.");

  state.security.passwordHash = await hashString(newPass);
  saveState();
  closeModal("password-modal");
  customAlert("Senha alterada com sucesso.");
}

async function deleteAllData() {
  const pass = $("delete-password")?.value;
  const confirmText = $("delete-confirmation")?.value.trim();

  const passHash = await hashString(pass);
  if (state.security.passwordHash && passHash !== state.security.passwordHash) {
    return showElement("delete-error", "Senha incorreta.");
  }
  if (confirmText !== "APAGAR") {
    return showElement("delete-error", "Digite APAGAR para confirmar.");
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("fx01_data");
  state = null;
  closeModal("delete-data-modal");
  startInitialSetup();
}

function lockApp() {
  if (state) state.security.locked = true;
  if ($("unlock-username")) $("unlock-username").value = state?.user?.username || "";
  if ($("unlock-password")) {
    $("unlock-password").value = "";
    $("unlock-password").type = "password";
  }
  renderLockPasswordIcon();
  hideElement("unlock-error");

  const bioTrigger = $("biometric-unlock-icon");
  
  if (state && state.security && state.security.biometricId) {
    if (bioTrigger) bioTrigger.classList.remove("hidden");
    saveState();
    showScreen("lock");
    
    setTimeout(() => {
      authenticateBiometric();
    }, 250);
  } else {
    if (bioTrigger) bioTrigger.classList.add("hidden");
    saveState();
    showScreen("lock");
  }
}

function renderLockPasswordIcon() {
  const container = $("eye-icon-container");
  if (!container) return;
  const isText = $("unlock-password")?.type === "text";
  container.innerHTML = isText ? SVG_EYE_SLASH : SVG_EYE_OPEN;
}

function renderHideBalancesIcon() {
  const container = $("hide-balances-icon-container");
  if (!container) return;
  container.innerHTML = state.settings.hideBalances ? SVG_EYE_SLASH : SVG_EYE_OPEN;
}

function toggleHideBalances() {
  if (!state) return;
  state.settings.hideBalances = !state.settings.hideBalances;
  saveState();
  renderApplication();
}

function customAlert(message) {
  setText("custom-alert-message", message);
  openModal("custom-alert-modal");
}

function customConfirm(message, onConfirm) {
  setText("custom-confirm-message", message);
  customConfirmCallback = onConfirm;
  openModal("custom-confirm-modal");
}

function renderApplication() {
  if (!state) return;
  setText("user-display-name", state.user?.displayName || state.user?.name || "Usuário");
  renderHideBalancesIcon();
  renderBalances();
  renderCategories();
  renderExpensesGrouped();
  renderSettingsCategories();
  renderSettingsValues();
}

function renderBalances() {
  const salary = getSalaryBalance();
  const extra = getExtraBalance();
  const available = roundMoney(salary + extra);

  setText("salary-balance", formatMoneyOrMask(salary));
  setText("extra-balance", formatMoneyOrMask(extra));
  setText("available-balance", formatMoneyOrMask(available));
  setText("reserve-balance", formatMoneyOrMask(getReserveBalance()));
}

function renderCategories() {
  const container = $("categories-list");
  if (!container) return;
  container.innerHTML = "";

  state.categories.forEach((cat) => {
    const card = document.createElement("div");
    card.className = "category-card";

    const usage = state.currentCycle?.categoryUsage[cat.id] || 0;
    let spentText = "";
    let progressHtml = "";

    if (cat.id === "reserve") {
      spentText = `Saldo: ${formatMoneyOrMask(getReserveBalance())}`;
    } else if (cat.hasLimit && cat.limit && cat.limit > 0) {
      const pct = Math.min(100, (usage / cat.limit) * 100);
      const isFull = usage >= cat.limit;
      spentText = `${formatMoneyOrMask(usage)} / ${formatMoneyOrMask(cat.limit)}`;
      progressHtml = `
        <div class="category-progress">
          <div class="category-progress-bar ${isFull ? "full" : ""}" style="width: ${pct}%"></div>
        </div>
      `;
    } else {
      spentText = `Consumido: ${formatMoneyOrMask(usage)}`;
    }

    card.innerHTML = `
      <div class="category-main" data-category-expense="${cat.id}">
        <div class="category-top">
          <span class="category-name" style="display:flex; align-items:center; gap:8px;">
            ${getCategoryIconSvg(cat)}
            ${escapeHTML(cat.name)}
          </span>
          <span class="category-balance">${spentText}</span>
        </div>
        ${progressHtml}
      </div>
      <button type="button" class="category-icon-button" data-category-open="${cat.id}" aria-label="Detalhes de ${cat.name}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
    `;
    container.appendChild(card);
  });
}

function renderExpensesGrouped() {
  const container = $("expenses-list");
  if (!container) return;
  container.innerHTML = "";

  const expenses = state.currentCycle?.expenses || [];
  if (!expenses.length) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum gasto registrado neste ciclo.</div>`;
    return;
  }

  const groups = {};
  expenses.forEach((exp) => {
    const dateKey = new Date(exp.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(exp);
  });

  Object.keys(groups).forEach((dateTitle) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "expense-group";

    let itemsHTML = "";
    groups[dateTitle].forEach((exp) => {
      const cat = state.categories.find((c) => c.id === exp.categoryId);
      const catName = cat ? cat.name : "Outros";

      let badgeClass = "badge-extra";
      let badgeLabel = "Extra";

      if (exp.origin === "salary") {
        badgeClass = "badge-salary";
        badgeLabel = "Salário";
      } else if (exp.origin === "reserve") {
        badgeClass = "badge-reserve";
        badgeLabel = "Reserva";
      }

      itemsHTML += `
        <div class="expense-item-card" data-edit-expense-id="${exp.id}">
          <div class="expense-item-left">
            <div class="expense-item-icon" style="color:var(--accent);">${getCategoryIconSvg(cat)}</div>
            <div class="expense-item-details">
              <span class="expense-item-title">${escapeHTML(exp.description || catName)}</span>
              <div class="expense-item-sub">
                <span class="expense-origin-badge ${badgeClass}">${badgeLabel}</span>
                <span class="expense-item-time">${new Date(exp.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>
          <span class="expense-item-amount">${formatMoneyOrMask(exp.amount)}</span>
        </div>
      `;
    });

    groupDiv.innerHTML = `
      <div class="expense-group-date">${dateTitle}</div>
      <div class="expense-group-items">${itemsHTML}</div>
    `;

    container.appendChild(groupDiv);
  });
}

function renderSettingsValues() {
  if ($("settings-account-username")) $("settings-account-username").value = state.user?.username || "";
  if ($("settings-full-name")) $("settings-full-name").value = state.user?.fullName || "";
  if ($("settings-username")) $("settings-username").value = state.user?.displayName || state.user?.name || "";
  if ($("settings-salary")) $("settings-salary").value = Number(state.salary.reference).toFixed(2);
  if ($("settings-cycle-day")) $("settings-cycle-day").value = state.settings.cycleDay;
  if ($("settings-advance-val")) $("settings-advance-val").value = Number(state.salary.advanceAmount || 0).toFixed(2);
  settingsSalarySplit = state.salary.hasAdvance ? "yes" : "no";
  updateSalarySplitButtons();
  renderPersonalizationControls();
}

function updateSalarySplitButtons() {
  document.querySelectorAll("[data-settings-salary-split]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.settingsSalarySplit === settingsSalarySplit);
  });
  $("salary-split-info")?.classList.toggle("hidden", settingsSalarySplit !== "yes");
}

/* PARSER MONETÁRIO DE ALTA PRECISÃO COM EXPRESSÃO REGULAR ESTRITA */
function parseMoneyInput(value) {
  if (value === null || value === undefined) return 0;
  let text = String(value).trim().replace(/\s/g, "");
  if (!text) return 0;

  // Trata formatos com vírgula e múltiplos pontos (ex: 1.500,50)
  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const number = parseFloat(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? roundMoney(number) : 0;
}

function openRecoveryModal() {
  hideElement("recovery-error");
  const question = state?.security?.recoveryQuestion || "";
  if (!question || !state?.security?.recoveryAnswerHash) {
    return customAlert("Esta conta não possui pergunta de recuperação cadastrada.");
  }
  setText("recovery-question-label", question);
  if ($("recovery-username")) $("recovery-username").value = state.user?.username || "";
  $("recovery-answer").value = "";
  $("recovery-new-password").value = "";
  $("recovery-confirm-password").value = "";
  openModal("recovery-modal");
}

async function recoverPassword() {
  const username = $("recovery-username")?.value.trim() || "";
  const answer = $("recovery-answer")?.value || "";
  const newPass = $("recovery-new-password")?.value || "";
  const confirm = $("recovery-confirm-password")?.value || "";

  const answerHash = await hashString(answer);

  if (username.toLowerCase() !== String(state.user?.username || "").toLowerCase()) return showElement("recovery-error", "Usuário incorreto.");
  if (answerHash !== state.security.recoveryAnswerHash) return showElement("recovery-error", "Resposta de recuperação incorreta.");
  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPass)) return showElement("recovery-error", "A nova senha precisa ter no mínimo 8 caracteres, 1 maiúscula e 1 número.");
  if (newPass !== confirm) return showElement("recovery-error", "As novas senhas não coincidem.");

  state.security.passwordHash = await hashString(newPass);
  state.security.locked = false;
  await saveState();
  closeModal("recovery-modal");
  customAlert("Senha redefinida com sucesso.");
}

function bindEvents() {
  $("setup-next-button")?.addEventListener("click", handleSetupNext);
  $("setup-back-button")?.addEventListener("click", () => {
    if (currentSetupStep > 1) {
      currentSetupStep--;
      renderSetupStep();
    }
  });

  $("setup-recovery-question-trigger")?.addEventListener("click", () => {
    const opts = RECOVERY_QUESTIONS.map(q => ({
      label: q.label,
      value: q.value,
      selected: q.value === setupRecoveryQuestionKey
    }));
    openCustomPicker("Pergunta de Recuperação", opts, (val) => {
      setupRecoveryQuestionKey = val;
      $("setup-custom-question-wrap")?.classList.toggle("hidden", val !== "custom");
    });
  });

  $("toggle-setup-password")?.addEventListener("click", () => togglePasswordField("setup-password", "setup-password-eye"));
  $("toggle-setup-password-confirm")?.addEventListener("click", () => togglePasswordField("setup-password-confirm", "setup-password-confirm-eye"));
  $("setup-limit-yes")?.addEventListener("click", () => { setupLimitHasLimit = true; updateSetupLimitButtons(); });
  $("setup-limit-no")?.addEventListener("click", () => { setupLimitHasLimit = false; updateSetupLimitButtons(); });
  $("save-setup-limit-button")?.addEventListener("click", saveSetupLimit);

  $("nav-home-button")?.addEventListener("click", () => switchTab("home"));
  $("nav-extrato-button")?.addEventListener("click", () => switchTab("extrato"));
  $("previous-cycle-button")?.addEventListener("click", () => openHistoryModal());

  $("export-backup-button")?.addEventListener("click", exportBackup);
  $("export-csv-button")?.addEventListener("click", exportCSV);
  $("import-backup-button")?.addEventListener("click", () => $("import-backup-file")?.click());
  $("import-backup-file")?.addEventListener("change", importBackup);

  $("custom-alert-ok")?.addEventListener("click", () => closeModal("custom-alert-modal"));
  $("custom-confirm-cancel")?.addEventListener("click", () => closeModal("custom-confirm-modal"));
  $("custom-confirm-ok")?.addEventListener("click", () => {
    closeModal("custom-confirm-modal");
    if (typeof customConfirmCallback === "function") customConfirmCallback();
  });

  $("toggle-lock-password")?.addEventListener("click", () => {
    const input = $("unlock-password");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    renderLockPasswordIcon();
  });

  $("toggle-hide-balances-button")?.addEventListener("click", toggleHideBalances);

  $("biometric-unlock-icon")?.addEventListener("click", authenticateBiometric);
  $("register-biometrics-button")?.addEventListener("click", registerBiometrics);

  $("edit-expense-origin-trigger")?.addEventListener("click", () => {
    const opts = [
      { label: "Salário", value: "salary", selected: selectedEditExpenseOrigin === "salary" },
      { label: "Extra", value: "extra", selected: selectedEditExpenseOrigin === "extra" },
      { label: "Reserva", value: "reserve", selected: selectedEditExpenseOrigin === "reserve" }
    ];
    openCustomPicker("Origem do Gasto", opts, (val) => { selectedEditExpenseOrigin = val; });
  });

  $("edit-expense-category-trigger")?.addEventListener("click", () => {
    const opts = state.categories
      .filter((c) => c.id !== "reserve")
      .map((c) => ({ label: c.name, value: c.id, selected: c.id === selectedEditExpenseCategory }));
    openCustomPicker("Categoria do Gasto", opts, (val) => { selectedEditExpenseCategory = val; });
  });

  $("category-icon-trigger")?.addEventListener("click", () => {
    openCustomPicker("Ícone da Categoria", [
      { label: "Gasto Fixo (Casa)", value: "fixed", selected: selectedCategoryIcon === "fixed" },
      { label: "Reserva (Cofre)", value: "reserve", selected: selectedCategoryIcon === "reserve" },
      { label: "Medicamentos (Remédio)", value: "medicine", selected: selectedCategoryIcon === "medicine" },
      { label: "Lazer (Controle)", value: "leisure", selected: selectedCategoryIcon === "leisure" },
      { label: "Celular (Smartphone)", value: "phone", selected: selectedCategoryIcon === "phone" },
      { label: "Outros (Caixa)", value: "other", selected: selectedCategoryIcon === "other" }
    ], (val) => { selectedCategoryIcon = val; });
  });

  document.addEventListener("click", (e) => {
    // Interatividade do Card Extra: clicar na área do card abre o modal
    const extraCard = e.target.closest(".extra-source");
    if (extraCard && !e.target.closest("#add-extra-button")) {
      openModal("extra-modal");
      return;
    }

    const historyItem = e.target.closest("[data-history-cycle-id]");
    if (historyItem) {
      openHistoryModal(historyItem.dataset.historyCycleId);
      return;
    }

    const backHistoryBtn = e.target.closest("[data-back-to-history]");
    if (backHistoryBtn) {
      openHistoryModal();
      return;
    }

    const setupCatItem = e.target.closest("[data-setup-cat-index]");
    if (setupCatItem) {
      openSetupLimitModal(Number(setupCatItem.dataset.setupCatIndex));
      return;
    }

    const setupSplitBtn = e.target.closest("[data-choice='salary-split']");
    if (setupSplitBtn) {
      setupSalarySplit = setupSplitBtn.dataset.value;
      document.querySelectorAll("[data-choice='salary-split']").forEach((btn) => {
        btn.classList.toggle("selected", btn.dataset.value === setupSalarySplit);
      });
      $("setup-advance-container")?.classList.toggle("hidden", setupSalarySplit !== "yes");
      return;
    }

    const categoryLimitBtn = e.target.closest("[data-category-limit]");
    if (categoryLimitBtn) {
      categoryEditorHasLimit = categoryLimitBtn.dataset.categoryLimit === "yes";
      document.querySelectorAll("[data-category-limit]").forEach((btn) => {
        btn.classList.toggle("selected", btn.dataset.categoryLimit === (categoryEditorHasLimit ? "yes" : "no"));
      });
      $("category-limit-value-container")?.classList.toggle("hidden", !categoryEditorHasLimit);
      return;
    }

    const settingsToggle = e.target.closest("[data-settings-toggle]");
    if (settingsToggle) {
      const panel = $(settingsToggle.dataset.settingsToggle);
      if (panel) {
        const isHidden = panel.classList.toggle("hidden");
        const chevron = settingsToggle.querySelector(".chevron");
        if (chevron) chevron.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
      }
      return;
    }

    const editCatBtn = e.target.closest("[data-edit-category-id]");
    if (editCatBtn) {
      openCategoryEditorModal(editCatBtn.dataset.editCategoryId);
      return;
    }

    const reserveOriginSalaryBtn = e.target.closest("#reserve-origin-salary-btn");
    if (reserveOriginSalaryBtn) {
      selectedReserveOrigin = "salary";
      updateReserveModalOriginButtons();
      return;
    }

    const reserveOriginExtraBtn = e.target.closest("#reserve-origin-extra-btn");
    if (reserveOriginExtraBtn) {
      selectedReserveOrigin = "extra";
      updateReserveModalOriginButtons();
      return;
    }

    const expenseOriginSalaryBtn = e.target.closest("#expense-origin-salary-btn");
    if (expenseOriginSalaryBtn) {
      selectedExpenseOrigin = "salary";
      updateExpenseModalOriginButtons();
      return;
    }

    const expenseOriginExtraBtn = e.target.closest("#expense-origin-extra-btn");
    if (expenseOriginExtraBtn) {
      selectedExpenseOrigin = "extra";
      updateExpenseModalOriginButtons();
      return;
    }

    const settingsSplit = e.target.closest("[data-settings-salary-split]");
    if (settingsSplit) {
      settingsSalarySplit = settingsSplit.dataset.settingsSalarySplit;
      updateSalarySplitButtons();
      return;
    }

    const openCatBtn = e.target.closest("[data-category-open]");
    if (openCatBtn) {
      openCategoryDetails(openCatBtn.dataset.categoryOpen);
      return;
    }

    const editItem = e.target.closest("[data-edit-expense-id]");
    if (editItem) {
      closeModal("category-modal");
      openEditExpenseModal(editItem.dataset.editExpenseId);
      return;
    }

    const catExpense = e.target.closest("[data-category-expense]");
    if (catExpense) {
      const catId = catExpense.dataset.categoryExpense;
      if (catId === "reserve") {
        openReserveModal();
      } else {
        openExpenseModal(catId);
      }
      return;
    }

    const closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      closeModal(closeBtn.dataset.closeModal);
      return;
    }
  });

  $("unlock-button")?.addEventListener("click", async () => {
    const username = $("unlock-username")?.value.trim() || "";
    const pass = $("unlock-password")?.value || "";
    const storedUsername = String(state?.user?.username || "").trim();
    const usernameOk = !storedUsername || username.toLowerCase() === storedUsername.toLowerCase();
    
    const inputHash = await hashString(pass);

    if (usernameOk && state.security.passwordHash && inputHash === state.security.passwordHash) {
      unlockSuccess();
    } else {
      showElement("unlock-error", "Usuário ou senha incorretos.");
    }
  });

  $("save-profile-settings")?.addEventListener("click", saveProfileSettings);
  document.querySelectorAll("[data-appearance]").forEach((btn) => btn.addEventListener("click", () => saveAppearance(btn.dataset.appearance)));
  document.querySelectorAll("[data-theme-choice]").forEach((btn) => btn.addEventListener("click", () => saveTheme(btn.dataset.themeChoice)));
  $("forgot-password-button")?.addEventListener("click", openRecoveryModal);
  $("recover-password-button")?.addEventListener("click", recoverPassword);
  $("logout-button")?.addEventListener("click", lockApp);

  $("create-category-button")?.addEventListener("click", () => openCategoryEditorModal());
  $("save-category-button")?.addEventListener("click", saveCategory);

  $("add-extra-button")?.addEventListener("click", () => openModal("extra-modal"));
  $("confirm-extra-button")?.addEventListener("click", () => {
    const val = parseMoneyInput($("extra-value")?.value);
    if (val <= 0) return showElement("extra-error", "Valor inválido.");

    state.extra.balance = roundMoney(state.extra.balance + val);
    saveState();
    closeModal("extra-modal");
    if (document.activeElement) document.activeElement.blur();
    renderApplication();
  });

  $("confirm-expense-button")?.addEventListener("click", () => {
    try {
      const val = parseMoneyInput($("expense-value").value);
      const origin = selectedExpenseOrigin;
      const desc = $("expense-description").value;
      launchExpense(currentCategoryId, val, origin, desc);
      closeModal("expense-modal");
    } catch (err) {
      showElement("expense-error", err.message);
    }
  });

  $("save-expense-edit-button")?.addEventListener("click", saveExpenseEdit);
  $("delete-expense-button")?.addEventListener("click", deleteExpense);

  $("reserve-save-button")?.addEventListener("click", showReserveSaveForm);
  $("reserve-withdraw-button")?.addEventListener("click", showWithdrawForm);
  $("confirm-reserve-button")?.addEventListener("click", confirmReserveSave);
  $("confirm-withdraw-button")?.addEventListener("click", confirmReserveWithdraw);

  $("save-salary-settings")?.addEventListener("click", saveSalarySettings);
  $("save-cycle-settings")?.addEventListener("click", saveCycleSettings);
  $("change-password-button")?.addEventListener("click", () => openModal("password-modal"));
  $("save-password-button")?.addEventListener("click", saveNewPassword);
  $("delete-all-data-button")?.addEventListener("click", () => openModal("delete-data-modal"));
  $("confirm-delete-data-button")?.addEventListener("click", deleteAllData);

  $("chart-button")?.addEventListener("click", openChartModal);
  $("settings-button")?.addEventListener("click", () => showScreen("settings"));
  $("settings-back-button")?.addEventListener("click", () => showScreen("main"));
  $("lock-button")?.addEventListener("click", lockApp);
}

function switchTab(tab) {
  $("tab-home").classList.toggle("hidden", tab !== "home");
  $("tab-extrato").classList.toggle("hidden", tab !== "extrato");
  $("nav-home-button").classList.toggle("active", tab === "home");
  $("nav-extrato-button").classList.toggle("active", tab === "extrato");
}

function openExpenseModal(catId) {
  if (catId === "reserve") {
    openReserveModal();
    return;
  }
  currentCategoryId = catId;
  selectedExpenseOrigin = "salary";

  const cat = state.categories.find((c) => c.id === catId);
  const catName = cat?.name || "Categoria";

  if ($("expense-modal-title")) $("expense-modal-title").textContent = `Lançar em ${catName}`;
  if ($("confirm-expense-button")) $("confirm-expense-button").textContent = `Lançar em ${catName}`;

  $("expense-value").value = "";
  $("expense-description").value = "";

  updateExpenseModalOriginButtons();
  hideElement("expense-error");
  openModal("expense-modal");
}

function updateExpenseModalOriginButtons() {
  const salaryBtn = $("expense-origin-salary-btn");
  const extraBtn = $("expense-origin-extra-btn");

  if (salaryBtn) salaryBtn.classList.toggle("selected", selectedExpenseOrigin === "salary");
  if (extraBtn) extraBtn.classList.toggle("selected", selectedExpenseOrigin === "extra");

  setText("expense-salary-available", formatMoneyOrMask(getSalaryBalance()));
  setText("expense-extra-available", formatMoneyOrMask(getExtraBalance()));
}

function togglePasswordField(inputId, iconId) {
  const input = $(inputId);
  const icon = $(iconId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  if (icon) icon.innerHTML = input.type === "password" ? SVG_EYE_OPEN : SVG_EYE_SLASH;
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s?.classList.add("hidden"));
  screens[name]?.classList.remove("hidden");
}

function openModal(id) { $(id)?.classList.remove("hidden"); }
function closeModal(id) { $(id)?.classList.add("hidden"); }

function roundMoney(v) { return Math.round((Number(v) + Number.EPSILON) * 100) / 100; }
function formatMoney(v) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); }
function formatMoneyOrMask(v) { return state && state.settings && state.settings.hideBalances ? "R$ •••••" : formatMoney(v); }
function setText(id, txt) { if ($(id)) $(id).textContent = txt; }
function showElement(id, msg) { const el = $(id); if (el) { if (msg) el.textContent = msg; el.classList.remove("hidden"); } }
function hideElement(id) { $(id)?.classList.add("hidden"); }
function escapeHTML(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function createId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
