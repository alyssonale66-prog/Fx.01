/* ============================================================
   FX.01 — Versão Final Ajustada
   Lógica principal, controle financeiro e regras de negócio
   ============================================================ */

"use strict";

/* ============================================================
   CONFIGURAÇÕES FIXAS E CONSTANTES
   ============================================================ */

const FX_VERSION = "FX.01";
const STORAGE_KEY = "fx01_data";

/*
 * Chave Mestra do FX para recuperação e autorização.
 */
const MASTER_KEY = ["F", "x", "0", "2", "0", "9", "1", "9"].join("");

const DEFAULT_CATEGORIES = [
  {
    id: "fixed",
    name: "Gasto Fixo",
    icon: "🏠",
    hasLimit: false,
    limit: null,
    protected: true
  },
  {
    id: "reserve",
    name: "Reserva",
    icon: "💰",
    hasLimit: false,
    limit: null,
    protected: true,
    immutable: true
  },
  {
    id: "medicine",
    name: "Medicamentos",
    icon: "💊",
    hasLimit: false,
    limit: null,
    protected: true
  },
  {
    id: "leisure",
    name: "Lazer",
    icon: "🎮",
    hasLimit: false,
    limit: null,
    protected: true
  },
  {
    id: "phone",
    name: "Celular",
    icon: "📱",
    hasLimit: false,
    limit: null,
    protected: true
  },
  {
    id: "other",
    name: "Outros",
    icon: "📦",
    hasLimit: false,
    limit: null,
    protected: true
  }
];

/* ============================================================
   ESTADO TEMPORÁRIO DE INTERFACE
   ============================================================ */

let state = null;
let currentCategoryId = null;
let currentEditingCategoryId = null;
let currentSetupStep = 1;
let setupSalarySplit = null;
let setupCategories = [];
let settingsSalarySplit = null;
let categoryEditorHasLimit = false;
let selectedReserveOrigin = null;

/* ============================================================
   MAPEAMENTO DOM
   ============================================================ */

const $ = (id) => document.getElementById(id);

const screens = {
  setup: $("setup-screen"),
  lock: $("lock-screen"),
  main: $("main-screen"),
  settings: $("settings-screen")
};

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initializeApplication();
});

function initializeApplication() {
  bindEvents();
  loadApplication();
}

/* ============================================================
   PERSISTÊNCIA (LOCALSTORAGE)
   ============================================================ */

function saveState() {
  if (!state) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadApplication() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    startInitialSetup();
    return;
  }

  try {
    state = JSON.parse(stored);
    normalizeState();

    if (!state.setupCompleted) {
      startInitialSetup();
      return;
    }

    if (state.security && state.security.locked) {
      showScreen("lock");
      return;
    }

    showScreen("main");
    renderApplication();
  } catch (error) {
    console.error("Erro ao carregar os dados do FX:", error);
    localStorage.removeItem(STORAGE_KEY);
    startInitialSetup();
  }
}

/* ============================================================
   NORMALIZAÇÃO DE DADOS
   ============================================================ */

function normalizeState() {
  if (!state || typeof state !== "object") {
    state = createEmptyState();
    return;
  }

  if (!Array.isArray(state.categories)) state.categories = [];
  if (!Array.isArray(state.cycles)) state.cycles = [];
  if (!state.currentCycle) state.currentCycle = null;

  if (!state.reserve || typeof state.reserve !== "object") {
    state.reserve = { balance: 0 };
  }
  if (!Number.isFinite(Number(state.reserve.balance))) {
    state.reserve.balance = 0;
  }

  if (!state.salary || typeof state.salary !== "object") {
    state.salary = { reference: 0, split: false };
  }

  if (!state.extra || typeof state.extra !== "object") {
    state.extra = { balance: 0 };
  }
  if (!Number.isFinite(Number(state.extra.balance))) {
    state.extra.balance = 0;
  }

  if (!state.security || typeof state.security !== "object") {
    state.security = { password: "", locked: false };
  }

  if (!state.settings || typeof state.settings !== "object") {
    state.settings = { cycleDay: 5 };
  }

  if (!Number.isInteger(Number(state.settings.cycleDay))) {
    state.settings.cycleDay = 5;
  }

  state.categories.forEach(category => {
    if (category.id === "reserve") {
      category.name = "Reserva";
      category.icon = "💰";
      category.hasLimit = false;
      category.limit = null;
      category.protected = true;
      category.immutable = true;
    }

    if (category.id === "other") {
      category.hasLimit = false;
      category.limit = null;
      category.protected = true;
    }
  });

  normalizeCycle(state.currentCycle);
  state.cycles.forEach(cycle => normalizeCycle(cycle));
}

function normalizeCycle(cycle) {
  if (!cycle) return;

  if (!Array.isArray(cycle.expenses)) cycle.expenses = [];
  if (!Array.isArray(cycle.transfers)) cycle.transfers = [];
  if (!cycle.categoryUsage || typeof cycle.categoryUsage !== "object") {
    cycle.categoryUsage = {};
  }

  if (!cycle.salaryReceived) cycle.salaryReceived = 0;
  if (!cycle.extraAtStart) cycle.extraAtStart = 0;
  if (!cycle.salaryAdded) cycle.salaryAdded = false;

  if (state && Array.isArray(state.categories)) {
    state.categories.forEach(category => {
      let total = 0;
      cycle.expenses.forEach(expense => {
        if (expense.categoryId === category.id) {
          total += Number(expense.amount) || 0;
        }
      });
      cycle.categoryUsage[category.id] = roundMoney(total);
    });
  }
}

function createEmptyState() {
  return {
    version: FX_VERSION,
    setupCompleted: false,
    user: { name: "" },
    security: { password: "", locked: false },
    salary: { reference: 0, split: false },
    extra: { balance: 0 },
    reserve: { balance: 0 },
    settings: { cycleDay: 5 },
    categories: [],
    cycles: [],
    currentCycle: null
  };
}

/* ============================================================
   CONFIGURAÇÃO INICIAL (SETUP)
   ============================================================ */

function startInitialSetup() {
  state = createEmptyState();
  setupCategories = cloneDefaultCategories();
  currentSetupStep = 1;
  setupSalarySplit = null;

  showScreen("setup");
  renderSetupStep();
}

function cloneDefaultCategories() {
  return DEFAULT_CATEGORIES.map(category => ({ ...category }));
}

function renderSetupStep() {
  const steps = document.querySelectorAll(".setup-step");
  steps.forEach(step => {
    const stepNumber = Number(step.dataset.step);
    step.classList.toggle("hidden", stepNumber !== currentSetupStep);
  });

  if (currentSetupStep === 6) {
    renderSetupCategories();
  }

  const button = $("setup-next-button");
  if (button) {
    button.textContent = currentSetupStep === 6 ? "Concluir configuração" : "Continuar";
  }
}

function renderSetupCategories() {
  const container = $("setup-categories");
  if (!container) return;

  container.innerHTML = "";
  setupCategories.forEach(category => {
    const item = document.createElement("div");
    item.className = "settings-category-item";

    const editButton = category.id === "reserve" ? "" : `
      <button type="button" class="settings-category-edit" data-setup-category-edit="${escapeHTML(category.id)}">
        ✏️
      </button>
    `;

    item.innerHTML = `
      <div class="settings-category-icon">${escapeHTML(category.icon)}</div>
      <div class="settings-category-info">
        <div class="settings-category-name">${escapeHTML(category.name)}</div>
        <div class="settings-category-limit">
          ${category.hasLimit && category.limit > 0 ? `Limite: ${formatMoney(category.limit)}` : "Sem limite"}
        </div>
      </div>
      ${editButton}
    `;

    container.appendChild(item);
  });
}

function handleSetupNext() {
  if (currentSetupStep === 1) {
    const input = $("setup-username");
    const username = input ? input.value.trim() : "";
    if (!username) {
      showSetupError("Digite um nome de usuário.");
      if (input) input.focus();
      return;
    }
    state.user.name = username;
  }

  if (currentSetupStep === 2) {
    const input = $("setup-password");
    const password = input ? input.value : "";
    if (!password) {
      showSetupError("Crie uma senha.");
      if (input) input.focus();
      return;
    }
    state.security.password = password;
  }

  if (currentSetupStep === 3) {
    const input = $("setup-salary");
    const raw = input ? input.value : "";
    const salary = parseMoneyInput(raw);

    if (raw.trim() !== "" && salary === 0 && !isZeroMoneyInput(raw)) {
      showSetupError("Digite um salário válido.");
      if (input) input.focus();
      return;
    }

    if (salary < 0) {
      showSetupError("O salário não pode ser negativo.");
      if (input) input.focus();
      return;
    }
    state.salary.reference = salary;
  }

  if (currentSetupStep === 4) {
    if (setupSalarySplit === null) {
      showSetupError("Escolha se deseja dividir o salário.");
      return;
    }
    state.salary.split = setupSalarySplit === "yes";
  }

  if (currentSetupStep === 5) {
    const input = $("setup-cycle-day");
    const day = Number(input ? input.value : NaN);

    if (!Number.isInteger(day) || day < 1 || day > 28) {
      showSetupError("O dia do ciclo deve estar entre 1 e 28.");
      if (input) input.focus();
      return;
    }
    state.settings.cycleDay = day;
  }

  if (currentSetupStep < 6) {
    currentSetupStep++;
    renderSetupStep();
    return;
  }

  completeInitialSetup();
}

function showSetupError(message) {
  alert(message);
}

function completeInitialSetup() {
  state.categories = setupCategories.map(category => ({
    ...category,
    cycleUsage: 0
  }));

  state.setupCompleted = true;
  state.security.locked = false;

  createInitialCycle();
  addSalaryToCurrentCycle();
  saveState();

  showScreen("main");
  renderApplication();
}

function createInitialCycle() {
  const now = new Date();
  const cycleStart = calculateCurrentCycleStart(now, state.settings.cycleDay);

  state.currentCycle = {
    id: createId(),
    startDate: cycleStart.toISOString(),
    endDate: calculateNextCycleStart(cycleStart, state.settings.cycleDay).toISOString(),
    salaryAdded: false,
    salaryReceived: roundMoney(state.salary.reference),
    extraAtStart: roundMoney(state.extra.balance),
    expenses: [],
    transfers: [],
    categoryUsage: {}
  };

  state.categories.forEach(category => {
    state.currentCycle.categoryUsage[category.id] = 0;
  });

  state.cycles.push(cloneObject(state.currentCycle));
}

/* ============================================================
   CICLOS
   ============================================================ */

function calculateCurrentCycleStart(date, cycleDay) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  if (result.getDate() < cycleDay) {
    result.setMonth(result.getMonth() - 1);
  }
  result.setDate(cycleDay);
  return result;
}

function calculateNextCycleStart(startDate, cycleDay) {
  const result = new Date(startDate);
  result.setMonth(result.getMonth() + 1);
  result.setDate(cycleDay);
  return result;
}

function ensureCurrentCycle() {
  if (!state) return;

  if (!state.currentCycle) {
    createInitialCycle();
    addSalaryToCurrentCycle();
    saveState();
    return;
  }

  const now = new Date();
  let safety = 0;

  while (now >= new Date(state.currentCycle.endDate) && safety < 120) {
    startNewCycle();
    safety++;
  }
}

function startNewCycle() {
  const previousCycle = cloneObject(state.currentCycle);
  const alreadyStored = state.cycles.some(cycle => cycle.id === previousCycle.id);

  if (!alreadyStored) {
    state.cycles.push(previousCycle);
  }

  const newStart = new Date(previousCycle.endDate);
  const newEnd = calculateNextCycleStart(newStart, state.settings.cycleDay);

  state.currentCycle = {
    id: createId(),
    startDate: newStart.toISOString(),
    endDate: newEnd.toISOString(),
    salaryAdded: false,
    salaryReceived: roundMoney(state.salary.reference),
    extraAtStart: roundMoney(state.extra.balance),
    expenses: [],
    transfers: [],
    categoryUsage: {}
  };

  state.categories.forEach(category => {
    state.currentCycle.categoryUsage[category.id] = 0;
  });

  addSalaryToCurrentCycle();
  saveState();
}

/* ============================================================
   GESTÃO FINANCEIRA
   ============================================================ */

function addSalaryToCurrentCycle() {
  if (!state || !state.currentCycle) return;
  if (state.currentCycle.salaryAdded) return;

  const amount = roundMoney(state.salary.reference);
  state.currentCycle.salaryReceived = amount;
  state.currentCycle.salaryAdded = true;
  state.currentCycle.salaryEntryDate = new Date().toISOString();
}

function getSalaryBalance() {
  if (!state || !state.currentCycle) return 0;

  let balance = Number(state.currentCycle.salaryReceived || 0);

  state.currentCycle.expenses.forEach(expense => {
    if (expense.origin === "salary") {
      balance -= Number(expense.amount) || 0;
    }
  });

  state.currentCycle.transfers.forEach(transfer => {
    if (transfer.origin === "salary") {
      balance -= Number(transfer.amount) || 0;
    }
  });

  return roundMoney(Math.max(0, balance));
}

function addExtra(amount, description) {
  amount = roundMoney(amount);
  if (amount <= 0) {
    throw new Error("O valor do Extra deve ser maior que zero.");
  }

  state.extra.balance = roundMoney(state.extra.balance + amount);
  saveState();
  renderApplication();
}

function getExtraBalance() {
  return roundMoney(Math.max(0, state.extra.balance || 0));
}

function getReserveBalance() {
  return roundMoney(state && state.reserve ? state.reserve.balance : 0);
}

function saveToReserve(origin, amount) {
  amount = roundMoney(amount);

  if (amount <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }

  if (origin !== "salary" && origin !== "extra") {
    throw new Error("Escolha uma origem válida (Salário ou Extra).");
  }

  const available = getOriginBalance(origin);

  if (amount > available) {
    throw new Error("Não existe dinheiro suficiente nessa origem.");
  }

  if (!state.currentCycle.transfers) {
    state.currentCycle.transfers = [];
  }

  if (origin === "extra") {
    state.extra.balance = roundMoney(state.extra.balance - amount);
  }

  state.currentCycle.transfers.push({
    id: createId(),
    origin,
    amount: roundMoney(amount),
    type: origin === "salary" ? "salary-to-reserve" : "extra-to-reserve",
    description: "Transferência para Reserva",
    date: new Date().toISOString()
  });

  state.reserve.balance = roundMoney(state.reserve.balance + amount);

  saveState();
  renderApplication();
}

function withdrawFromReserve(amount) {
  amount = roundMoney(amount);

  if (amount <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }

  if (amount > state.reserve.balance) {
    throw new Error("Não existe saldo suficiente na Reserva.");
  }

  // Abate da reserva acumulada
  state.reserve.balance = roundMoney(state.reserve.balance - amount);

  // Vira automaticamente um lançamento de gasto na categoria "Outros" (Extrato)
  createExpenseRecord("reserve", amount, "Retirada da reserva", "reserve-withdrawal");
  incrementCategoryUsage("other", amount);

  saveState();
  renderApplication();
}

function getOriginBalance(origin) {
  if (origin === "salary") return getSalaryBalance();
  if (origin === "extra") return getExtraBalance();
  if (origin === "reserve") return getReserveBalance();
  return 0;
}

function launchExpense(categoryId, amount, origin, description) {
  amount = roundMoney(amount);

  if (amount <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }

  const category = findCategory(categoryId);
  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  if (category.id === "reserve") {
    throw new Error("A Reserva possui uma operação própria.");
  }

  if (origin !== "salary" && origin !== "extra") {
    throw new Error("Escolha uma origem válida (Salário ou Extra).");
  }

  const available = getOriginBalance(origin);
  if (amount > available) {
    throw new Error("O valor é maior que o saldo disponível da origem.");
  }

  if (category.hasLimit && category.limit !== null) {
    const limit = Number(category.limit) || 0;
    const used = getCategoryUsage(category.id);
    const remaining = roundMoney(limit - used);

    if (amount > remaining) {
      throw new Error("Esse gasto ultrapassa o limite da categoria.");
    }
  }

  if (origin === "extra") {
    state.extra.balance = roundMoney(state.extra.balance - amount);
  }

  createExpenseRecord(origin, amount, description, category.id);
  incrementCategoryUsage(category.id, amount);

  saveState();
  renderApplication();
}

function createExpenseRecord(origin, amount, description, type) {
  if (!state.currentCycle) return;

  const expense = {
    id: createId(),
    origin,
    amount: roundMoney(amount),
    description: description || "",
    type,
    categoryId:
      type === "reserve-withdrawal"
        ? "other"
        : type === "salary-to-reserve" || type === "extra-to-reserve"
        ? "reserve"
        : type,
    date: new Date().toISOString()
  };

  if (!Array.isArray(state.currentCycle.expenses)) {
    state.currentCycle.expenses = [];
  }

  state.currentCycle.expenses.push(expense);
}

function incrementCategoryUsage(categoryId, amount) {
  if (!state.currentCycle) return;
  if (!state.currentCycle.categoryUsage) state.currentCycle.categoryUsage = {};

  if (!Number.isFinite(Number(state.currentCycle.categoryUsage[categoryId]))) {
    state.currentCycle.categoryUsage[categoryId] = 0;
  }

  state.currentCycle.categoryUsage[categoryId] = roundMoney(
    state.currentCycle.categoryUsage[categoryId] + amount
  );
}

function getCategoryUsage(categoryId) {
  if (!state || !state.currentCycle || !state.currentCycle.categoryUsage) {
    return 0;
  }
  return roundMoney(state.currentCycle.categoryUsage[categoryId] || 0);
}

function getCategoryBalance(category) {
  if (!category) return 0;
  if (category.id === "reserve") return getReserveBalance();
  if (category.id === "other") return getCategoryUsage("other");
  if (!category.hasLimit || category.limit === null) return null;

  const usage = getCategoryUsage(category.id);
  const limit = Number(category.limit) || 0;
  return roundMoney(Math.max(0, limit - usage));
}

function getAvailableBalance() {
  return roundMoney(getSalaryBalance() + getExtraBalance());
}

function findCategory(id) {
  return state.categories.find(category => category.id === id);
}

function createCategory(name, icon, hasLimit, limit) {
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    throw new Error("Digite o nome da categoria.");
  }

  const finalHasLimit = Boolean(hasLimit);
  const finalLimit = finalHasLimit ? roundMoney(Number(limit) || 0) : null;

  const category = {
    id: "custom-" + createId(),
    name: cleanName,
    icon: String(icon || "").trim() || "📁",
    hasLimit: finalHasLimit,
    limit: finalLimit,
    protected: false,
    immutable: false
  };

  state.categories.push(category);

  if (state.currentCycle && state.currentCycle.categoryUsage) {
    state.currentCycle.categoryUsage[category.id] = 0;
  }

  saveState();
  renderApplication();
}

function updateCategory(categoryId, name, icon, hasLimit, limit) {
  const category = findCategory(categoryId);
  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  if (category.id === "reserve" || category.immutable) {
    throw new Error("A categoria Reserva é imutável e não pode ser alterada.");
  }

  const cleanName = String(name || "").trim();
  const cleanIcon = String(icon || "").trim();

  if (!cleanName) {
    throw new Error("Digite o nome da categoria.");
  }

  category.name = cleanName;
  category.icon = cleanIcon || category.icon || "📁";
  category.hasLimit = Boolean(hasLimit);
  category.limit = category.hasLimit ? roundMoney(Number(limit) || 0) : null;

  saveState();
  renderApplication();
}

/* ============================================================
   RENDERIZAÇÃO DA INTERFACE
   ============================================================ */

function renderApplication() {
  if (!state) return;

  ensureCurrentCycle();
  renderBalances();
  renderCategories();
  renderExpenses();
  renderSettingsCategories();
  renderSettingsValues();
}

function renderBalances() {
  const salary = getSalaryBalance();
  const extra = getExtraBalance();
  const available = salary + extra;

  setText("salary-balance", formatMoney(salary));
  setText("extra-balance", formatMoney(extra));
  setText("available-balance", formatMoney(available));
  setText("reserve-balance", formatMoney(getReserveBalance()));
}

function renderCategories() {
  const container = $("categories-list");
  if (!container) return;

  container.innerHTML = "";

  state.categories.forEach(category => {
    const card = document.createElement("div");

    const balance = getCategoryBalance(category);
    const usage = getCategoryUsage(category.id);
    let progressHTML = "";
    let isFull = false;

    if (category.hasLimit && category.limit !== null) {
      const limit = Number(category.limit) || 0;
      let percentage = 0;

      if (limit > 0) {
        percentage = Math.min(100, (usage / limit) * 100);
      } else if (usage > 0) {
        percentage = 100;
      }

      isFull = percentage >= 100;

      progressHTML = `
        <div class="category-progress">
          <div class="category-progress-bar ${isFull ? "full" : ""}" style="width:${percentage}%"></div>
        </div>
      `;
    }

    card.className = `category-card ${isFull ? "locked" : ""}`;

    let balanceText;
    if (category.id === "reserve") {
      balanceText = formatMoney(getReserveBalance());
    } else if (category.id === "other") {
      balanceText = formatMoney(usage);
    } else if (category.hasLimit && category.limit !== null) {
      balanceText = formatMoney(balance);
    } else {
      balanceText = "Sem limite";
    }

    card.innerHTML = `
      <div class="category-main" data-category-expense="${escapeHTML(category.id)}">
        <div class="category-top">
          <span class="category-name">${escapeHTML(category.name)}</span>
          <span class="category-balance">${balanceText}</span>
        </div>
        ${progressHTML}
      </div>
      <button type="button" class="category-icon-button" data-category-open="${escapeHTML(category.id)}" aria-label="Abrir ${escapeHTML(category.name)}">
        ${escapeHTML(category.icon)}
      </button>
    `;

    container.appendChild(card);
  });
}

function renderExpenses() {
  const container = $("expenses-list");
  if (!container) return;

  container.innerHTML = "";

  const expenses = state.currentCycle && Array.isArray(state.currentCycle.expenses)
    ? [...state.currentCycle.expenses]
    : [];

  // Ordena do mais recente para o mais antigo
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!expenses.length) {
    container.innerHTML = `<div class="empty-state">Nenhum gasto registrado neste ciclo.</div>`;
    return;
  }

  expenses.forEach(expense => {
    const item = document.createElement("div");
    item.className = "expense-item";

    const category = findCategory(expense.categoryId);
    const categoryIcon = category ? category.icon : "📦";
    const categoryName = category ? category.name : "Outros";
    const hasDescription = expense.description && expense.description.trim() !== "";

    item.innerHTML = `
      <div class="expense-info">
        <div class="expense-category-tag">
          <span class="expense-icon">${escapeHTML(categoryIcon)}</span>
          <strong class="expense-category-name">${escapeHTML(categoryName)}</strong>
        </div>
        ${hasDescription ? `<div class="expense-description">${escapeHTML(expense.description)}</div>` : ""}
        <div class="expense-date">${formatDateTime(expense.date)}</div>
      </div>
      <div class="expense-value-container">
        <span class="expense-value">${formatMoney(expense.amount)}</span>
      </div>
    `;

    container.appendChild(item);
  });
}

function renderSettingsCategories() {
  const container = $("settings-categories-list");
  if (!container) return;

  container.innerHTML = "";

  state.categories.forEach(category => {
    const item = document.createElement("div");
    item.className = "settings-category-item";

    const editButton = category.id === "reserve" ? "" : `
      <button type="button" class="settings-category-edit" data-edit-category="${escapeHTML(category.id)}">
        ✏️
      </button>
    `;

    item.innerHTML = `
      <div class="settings-category-icon">${escapeHTML(category.icon)}</div>
      <div class="settings-category-info">
        <div class="settings-category-name">${escapeHTML(category.name)}</div>
        <div class="settings-category-limit">
          ${category.hasLimit && category.limit !== null ? `Limite: ${formatMoney(category.limit)}` : "Sem limite"}
        </div>
      </div>
      ${editButton}
    `;

    container.appendChild(item);
  });
}

function renderSettingsValues() {
  const salaryInput = $("settings-salary");
  const cycleInput = $("settings-cycle-day");
  const previousLabel = $("previous-cycle-label");

  if (salaryInput) salaryInput.value = Number(state.salary.reference).toFixed(2);
  if (cycleInput) cycleInput.value = state.settings.cycleDay;

  const cycles = getAllCyclesForHistory();
  if (previousLabel) {
    if (cycles.length >= 2) {
      const prev = cycles[cycles.length - 2];
      previousLabel.textContent = `Mês anterior (${formatDate(prev.startDate)})`;
    } else {
      previousLabel.textContent = "Mês anterior";
    }
  }

  settingsSalarySplit = state.salary.split ? "yes" : "no";
  updateSalarySplitButtons();
}

/* ============================================================
   NAVEGAÇÃO E MODAIS
   ============================================================ */

function showScreen(name) {
  Object.values(screens).forEach(screen => {
    if (screen) screen.classList.add("hidden");
  });

  if (screens[name]) {
    screens[name].classList.remove("hidden");
  }
}

function openSettings() {
  showScreen("settings");
  renderSettingsCategories();
  renderSettingsValues();
}

function closeSettings() {
  showScreen("main");
  renderApplication();
}

function openModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.classList.add("hidden");
  clearModalState(id);
}

function clearModalState(id) {
  if (id === "expense-modal") currentCategoryId = null;
  if (id === "category-editor-modal") {
    currentEditingCategoryId = null;
    categoryEditorHasLimit = false;
  }
  if (id === "reserve-modal") {
    selectedReserveOrigin = null;
  }
}

/* ============================================================
   OPERAÇÕES FINANCEIRAS
   ============================================================ */

function openExpenseModal(categoryId) {
  const category = findCategory(categoryId);
  if (!category) return;

  if (category.id === "reserve") {
    openReserveModal();
    return;
  }

  currentCategoryId = categoryId;

  const title = $("expense-modal-title");
  if (title) title.textContent = `Lançar gasto — ${category.name}`;

  if ($("expense-value")) $("expense-value").value = "";
  if ($("expense-description")) $("expense-description").value = "";

  const originSelect = $("expense-origin");
  if (originSelect) {
    originSelect.value = "salary";
    Array.from(originSelect.options).forEach(opt => {
      if (opt.value === "reserve") {
        opt.disabled = true;
        opt.style.display = "none";
      } else {
        opt.disabled = false;
        opt.style.display = "";
      }
    });
  }

  hideElement("expense-error");
  openModal("expense-modal");
}

function confirmExpense() {
  try {
    const amount = parseMoneyInput($("expense-value") ? $("expense-value").value : "");
    const origin = $("expense-origin") ? $("expense-origin").value : "salary";
    const description = $("expense-description") ? $("expense-description").value.trim() : "";

    if (!currentCategoryId) {
      throw new Error("Nenhuma categoria selecionada.");
    }

    launchExpense(currentCategoryId, amount, origin, description);
    closeModal("expense-modal");
  } catch (error) {
    showElement("expense-error", error.message);
  }
}

function openExtraModal() {
  if ($("extra-value")) $("extra-value").value = "";
  if ($("extra-description")) $("extra-description").value = "";

  hideElement("extra-error");
  openModal("extra-modal");
}

function confirmExtra() {
  try {
    const amount = parseMoneyInput($("extra-value") ? $("extra-value").value : "");
    const description = $("extra-description") ? $("extra-description").value.trim() : "";

    addExtra(amount, description);
    closeModal("extra-modal");
  } catch (error) {
    showElement("extra-error", error.message);
  }
}

function openReserveModal() {
  if ($("reserve-value")) $("reserve-value").value = "";
  if ($("withdraw-value")) $("withdraw-value").value = "";
  selectedReserveOrigin = null;

  hideElement("reserve-error");
  hideElement("reserve-form");
  hideElement("withdraw-form");

  setText("reserve-balance", formatMoney(getReserveBalance()));
  openModal("reserve-modal");
}

function showReserveSaveForm() {
  hideElement("withdraw-form");
  showElement("reserve-form");
  showElement("reserve-origin-section");

  if ($("reserve-value")) $("reserve-value").value = "";

  selectedReserveOrigin = null;
  document.querySelectorAll("[data-reserve-origin]").forEach(btn => {
    btn.classList.remove("selected");
  });
  setText("selected-reserve-origin", "");

  setText("reserve-salary-available", formatMoney(getSalaryBalance()));
  setText("reserve-extra-available", formatMoney(getExtraBalance()));
}

function showWithdrawForm() {
  hideElement("reserve-form");
  showElement("withdraw-form");

  if ($("withdraw-value")) $("withdraw-value").value = "";
}

function confirmReserveSave() {
  try {
    if (!selectedReserveOrigin) {
      throw new Error("Selecione de onde o dinheiro será retirado (Salário ou Extra).");
    }

    const amount = parseMoneyInput($("reserve-value") ? $("reserve-value").value : "");

    saveToReserve(selectedReserveOrigin, amount);
    closeModal("reserve-modal");
  } catch (error) {
    showElement("reserve-error", error.message);
  }
}

function confirmReserveWithdraw() {
  try {
    const amount = parseMoneyInput($("withdraw-value") ? $("withdraw-value").value : "");
    withdrawFromReserve(amount);
    closeModal("reserve-modal");
  } catch (error) {
    showElement("reserve-error", error.message);
  }
}

/* ============================================================
   DETALHES E EDITOR DE CATEGORIA
   ============================================================ */

function openCategoryDetails(categoryId) {
  const category = findCategory(categoryId);
  if (!category) return;

  if (category.id === "reserve") {
    openReserveModal();
    return;
  }

  const container = $("category-details");
  if (!container) return;

  const expenses = state.currentCycle && Array.isArray(state.currentCycle.expenses)
    ? state.currentCycle.expenses
        .filter(expense => expense.categoryId === categoryId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const balance = getCategoryBalance(category);
  let balanceText;

  if (category.id === "other") {
    balanceText = `Lançado: ${formatMoney(getCategoryUsage("other"))}`;
  } else if (category.hasLimit && category.limit !== null) {
    balanceText = `Disponível: ${formatMoney(balance)}`;
  } else {
    balanceText = `Lançado: ${formatMoney(getCategoryUsage(category.id))}`;
  }

  let html = `
    <div class="category-detail-header">
      <div class="category-detail-icon">${escapeHTML(category.icon)}</div>
      <div class="category-detail-name">${escapeHTML(category.name)}</div>
      <div class="category-detail-balance">${balanceText}</div>
    </div>
    <div class="category-detail-expenses">
  `;

  if (!expenses.length) {
    html += `<div class="empty-state">Nenhum gasto nesta categoria.</div>`;
  } else {
    expenses.forEach(expense => {
      html += `
        <div class="expense-item">
          <div class="expense-info">
            <div class="expense-description">${escapeHTML(expense.description || category.name)}</div>
            <div class="expense-date">${formatDate(expense.date)}</div>
          </div>
          <div class="expense-value">${formatMoney(expense.amount)}</div>
        </div>
      `;
    });
  }

  html += `</div>`;
  container.innerHTML = html;
  openModal("category-modal");
}

function openCategoryEditor(categoryId = null) {
  currentEditingCategoryId = categoryId;
  const category = categoryId ? findCategory(categoryId) : null;

  if (category && (category.id === "reserve" || category.immutable)) {
    currentEditingCategoryId = null;
    alert("A categoria Reserva é imutável.");
    return;
  }

  if ($("category-name")) $("category-name").value = category ? category.name : "";
  if ($("category-icon")) $("category-icon").value = category ? category.icon : "📁";

  categoryEditorHasLimit = category ? Boolean(category.hasLimit && category.limit !== null) : false;

  if ($("category-limit-value")) {
    $("category-limit-value").value = category && category.hasLimit && category.limit !== null ? Number(category.limit).toFixed(2) : "";
  }

  updateCategoryLimitInterface();
  hideElement("category-editor-error");

  if ($("category-editor-title")) {
    $("category-editor-title").textContent = category ? "Editar categoria" : "Criar categoria";
  }

  openModal("category-editor-modal");
}

function updateCategoryLimitInterface() {
  document.querySelectorAll("[data-category-limit]").forEach(button => {
    const isYes = button.dataset.categoryLimit === "yes";
    button.classList.toggle("selected", isYes === Boolean(categoryEditorHasLimit));
  });

  const container = $("category-limit-value-container");
  if (container) {
    container.classList.toggle("hidden", !categoryEditorHasLimit);
  }

  if (!categoryEditorHasLimit && $("category-limit-value")) {
    $("category-limit-value").value = "";
  }
}

function saveCategoryFromEditor() {
  try {
    const name = $("category-name") ? $("category-name").value.trim() : "";
    const icon = $("category-icon") ? $("category-icon").value.trim() : "";
    let limit = null;

    if (categoryEditorHasLimit) {
      limit = parseMoneyInput($("category-limit-value") ? $("category-limit-value").value : "");
    }

    if (!name) throw new Error("Digite o nome da categoria.");
    if (categoryEditorHasLimit && (limit === null || limit < 0)) {
      throw new Error("Digite um limite válido.");
    }

    if (currentEditingCategoryId) {
      updateCategory(currentEditingCategoryId, name, icon, categoryEditorHasLimit, limit);
    } else {
      createCategory(name, icon, categoryEditorHasLimit, limit);
    }

    closeModal("category-editor-modal");
  } catch (error) {
    showElement("category-editor-error", error.message);
  }
}

/* ============================================================
   CONFIGURAÇÕES E CICLO
   ============================================================ */

function updateSalarySplitButtons() {
  document.querySelectorAll("[data-settings-salary-split]").forEach(button => {
    button.classList.toggle("selected", button.dataset.settingsSalarySplit === settingsSalarySplit);
  });

  const info = $("salary-split-info");
  if (info) {
    info.classList.toggle("hidden", settingsSalarySplit !== "yes");
  }
}

function saveSalarySettings() {
  const raw = $("settings-salary") ? $("settings-salary").value : "";
  const salary = parseMoneyInput(raw);

  if (raw.trim() !== "" && salary === 0 && !isZeroMoneyInput(raw)) {
    alert("Digite um salário válido.");
    if ($("settings-salary")) $("settings-salary").focus();
    return;
  }

  if (salary < 0) {
    alert("O salário não pode ser negativo.");
    return;
  }

  state.salary.reference = salary;
  state.salary.split = settingsSalarySplit === "yes";

  saveState();
  renderApplication();
  alert("Salário salvo com sucesso.");
}

function saveCycleSettings() {
  const newDay = Number($("settings-cycle-day") ? $("settings-cycle-day").value : NaN);

  if (!Number.isInteger(newDay) || newDay < 1 || newDay > 28) {
    alert("O dia deve ser entre 1 e 28.");
    if ($("settings-cycle-day")) $("settings-cycle-day").focus();
    return;
  }

  state.settings.cycleDay = newDay;
  saveState();
  alert("A alteração será aplicada no próximo ciclo.");
}

/* ============================================================
   HISTÓRICO E GRÁFICO PIZZA
   ============================================================ */

function getAllCyclesForHistory() {
  const list = [];
  if (Array.isArray(state.cycles)) {
    state.cycles.forEach(cycle => {
      if (cycle && cycle.id) list.push(cycle);
    });
  }

  if (state.currentCycle && state.currentCycle.id && !list.some(c => c.id === state.currentCycle.id)) {
    list.push(state.currentCycle);
  }

  list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return list;
}

function openPreviousCycle() {
  const cycles = getAllCyclesForHistory();
  if (cycles.length < 2) {
    alert("Ainda não existe um ciclo anterior registrado.");
    return;
  }
  showPreviousCycle(cycles, cycles.length - 2);
}

function showPreviousCycle(cycles, index) {
  if (!Array.isArray(cycles) || index < 0 || index >= cycles.length) return;
  const cycle = cycles[index];

  let html = `
    <div class="category-detail-header">
      <div class="category-detail-name">Mês anterior</div>
      <div class="category-detail-balance">${formatDate(cycle.startDate)} até ${formatDate(cycle.endDate)}</div>
    </div>
    <div class="category-detail-expenses">
      <div class="expense-item">
        <div class="expense-info"><div class="expense-description">Salário</div></div>
        <div class="expense-value">${formatMoney(cycle.salaryReceived || 0)}</div>
      </div>
  `;

  const expenses = Array.isArray(cycle.expenses)
    ? [...cycle.expenses].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  if (!expenses.length) {
    html += `<div class="empty-state">Nenhum gasto neste ciclo.</div>`;
  } else {
    expenses.forEach(expense => {
      const category = findCategory(expense.categoryId);
      html += `
        <div class="expense-item">
          <div class="expense-info">
            <div class="expense-description">${escapeHTML(expense.description || category?.name || "Outros")}</div>
            <div class="expense-date">${formatDateTime(expense.date)}</div>
          </div>
          <div class="expense-value">${formatMoney(expense.amount)}</div>
        </div>
      `;
    });
  }

  html += `</div>`;

  const container = $("category-details");
  if (container) {
    container.innerHTML = html;
    openModal("category-modal");
    return;
  }

  showDynamicHistoryModal(cycles, index);
}

function showDynamicHistoryModal(cycles, index) {
  const old = $("fx-history-modal");
  if (old) old.remove();

  const cycle = cycles[index];
  let expensesHTML = "";
  const expenses = Array.isArray(cycle.expenses) ? cycle.expenses : [];

  if (!expenses.length) {
    expensesHTML = `<div class="empty-state">Nenhum gasto neste ciclo.</div>`;
  } else {
    expensesHTML = expenses.map(expense => {
      const category = findCategory(expense.categoryId);
      return `
        <div class="expense-item">
          <div class="expense-info">
            <div class="expense-description">${escapeHTML(expense.description || category?.name || "Outros")}</div>
            <div class="expense-date">${formatDateTime(expense.date)}</div>
          </div>
          <div class="expense-value">${formatMoney(expense.amount)}</div>
        </div>
      `;
    }).join("");
  }

  const modal = document.createElement("div");
  modal.id = "fx-history-modal";
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content">
      <header class="modal-header">
        <h2>Mês anterior</h2>
        <button type="button" class="modal-close" data-history-close aria-label="Fechar">×</button>
      </header>
      <main class="modal-body">
        <p style="color:var(--text-secondary); font-size:14px;">${formatDate(cycle.startDate)} — ${formatDate(cycle.endDate)}</p>
        <div class="info-box" style="margin-bottom:12px;">Salário: <strong>${formatMoney(cycle.salaryReceived || 0)}</strong></div>
        <div>${expensesHTML}</div>
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button type="button" class="secondary-button" data-history-prev ${index <= 0 ? "disabled" : ""}>← Anterior</button>
          <button type="button" class="secondary-button" data-history-next ${index >= cycles.length - 1 ? "disabled" : ""}>Próximo →</button>
        </div>
      </main>
    </div>
  `;

  document.body.appendChild(modal);
  modal.classList.remove("hidden");

  modal.addEventListener("click", event => {
    if (event.target.closest("[data-history-close]")) { modal.remove(); return; }
    if (event.target.closest("[data-history-prev]")) { showDynamicHistoryModal(cycles, index - 1); return; }
    if (event.target.closest("[data-history-next]")) { showDynamicHistoryModal(cycles, index + 1); }
  });
}

function openPizza() {
  if (!state.currentCycle) return;

  const totals = state.categories
    .map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      value: getCategoryUsage(category.id)
    }))
    .filter(item => Number(item.value) > 0);

  const total = totals.reduce((sum, item) => sum + Number(item.value), 0);

  if (!totals.length || total <= 0) {
    alert("Ainda não existem gastos neste ciclo.");
    return;
  }

  let cursor = 0;
  const segments = totals.map(item => {
    const percentage = (Number(item.value) / total) * 100;
    const start = cursor;
    const end = cursor + percentage;
    cursor = end;
    return { ...item, percentage, start, end };
  });

  const coloredGradient = segments.map((item, index) => {
    const hue = Math.round((index / segments.length) * 360);
    return `hsl(${hue} 70% 50%) ${item.start}% ${item.end}%`;
  }).join(", ");

  const legend = segments.map((item, index) => {
    const hue = Math.round((index / segments.length) * 360);
    return `
      <div class="pizza-legend-item">
        <div class="pizza-legend-name">
          <span class="pizza-legend-dot" style="background:hsl(${hue} 70% 50%);"></span>
          <span>${escapeHTML(item.icon)} ${escapeHTML(item.name)}</span>
        </div>
        <strong>${formatMoney(item.value)}</strong>
      </div>
    `;
  }).join("");

  const old = $("fx-pizza-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "fx-pizza-modal";
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content" style="max-height:90dvh; overflow-y:auto;">
      <header class="modal-header">
        <h2>Gastos do ciclo</h2>
        <button type="button" class="modal-close" data-pizza-close aria-label="Fechar">×</button>
      </header>
      <main class="modal-body">
        <div class="pizza-container">
          <div class="pizza-chart" style="background:conic-gradient(${coloredGradient}); position:relative;">
            <div style="position:absolute; inset:28%; background:var(--surface); border-radius:50%; display:flex; align-items:center; justify-content:center; text-align:center; font-weight:800; color:var(--text); font-size:15px; border:1px solid var(--border);">
              ${formatMoney(total)}
            </div>
          </div>
          <div class="pizza-legend" style="width:100%;">${legend}</div>
        </div>
      </main>
    </div>
  `;

  document.body.appendChild(modal);
  modal.classList.remove("hidden");

  modal.addEventListener("click", event => {
    if (event.target.closest("[data-pizza-close]")) modal.remove();
  });
}

/* ============================================================
   SEGURANÇA E REGISTRO DE EVENTOS
   ============================================================ */

function isMasterKey(value) {
  return String(value || "") === MASTER_KEY;
}

function isValidSecurityCredential(value) {
  return String(value || "") === String(state.security.password || "") || isMasterKey(value);
}

function lockApplication() {
  state.security.locked = true;
  saveState();
  showScreen("lock");
}

function unlockApplication() {
  const password = $("unlock-password") ? $("unlock-password").value : "";

  if (!isValidSecurityCredential(password)) {
    showElement("unlock-error", "Senha incorreta.");
    return;
  }

  state.security.locked = false;
  if ($("unlock-password")) $("unlock-password").value = "";
  hideElement("unlock-error");

  saveState();
  showScreen("main");
  renderApplication();
}

function openPasswordModal() {
  if ($("current-password")) $("current-password").value = "";
  if ($("new-password")) $("new-password").value = "";
  if ($("confirm-new-password")) $("confirm-new-password").value = "";

  hideElement("password-error");
  openModal("password-modal");
}

function saveNewPassword() {
  const current = $("current-password") ? $("current-password").value : "";
  const newPassword = $("new-password") ? $("new-password").value : "";
  const confirmation = $("confirm-new-password") ? $("confirm-new-password").value : "";

  if (!isValidSecurityCredential(current)) {
    showElement("password-error", "A senha atual está incorreta.");
    return;
  }

  if (!newPassword) {
    showElement("password-error", "Digite a nova senha.");
    return;
  }

  if (newPassword !== confirmation) {
    showElement("password-error", "As senhas não coincidem.");
    return;
  }

  state.security.password = newPassword;
  saveState();
  closeModal("password-modal");
  alert("Senha alterada com sucesso.");
}

function openDeleteDataModal() {
  if ($("delete-password")) $("delete-password").value = "";
  if ($("delete-confirmation")) $("delete-confirmation").value = "";

  hideElement("delete-error");
  openModal("delete-data-modal");
}

function deleteAllData() {
  const password = $("delete-password") ? $("delete-password").value : "";
  const confirmation = $("delete-confirmation") ? $("delete-confirmation").value.trim() : "";

  if (!isValidSecurityCredential(password)) {
    showElement("delete-error", "Senha atual incorreta.");
    return;
  }

  if (confirmation !== "APAGAR") {
    showElement("delete-error", "Digite APAGAR para confirmar.");
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  state = null;
  closeModal("delete-data-modal");
  startInitialSetup();
}

function bindEvents() {
  const setupNext = $("setup-next-button");
  if (setupNext) setupNext.addEventListener("click", handleSetupNext);

  document.addEventListener("click", event => {

    const reserveOriginBtn = event.target.closest("[data-reserve-origin]");
    if (reserveOriginBtn) {
      selectedReserveOrigin = reserveOriginBtn.dataset.reserveOrigin;
      document.querySelectorAll("[data-reserve-origin]").forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.reserveOrigin === selectedReserveOrigin);
      });

      const labelText = selectedReserveOrigin === "salary" ? "Salário" : "Extra";
      setText("selected-reserve-origin", `Origem selecionada: ${labelText}`);
      return;
    }

    const splitButton = event.target.closest("[data-choice='salary-split']");
    if (splitButton) {
      setupSalarySplit = splitButton.dataset.value;
      document.querySelectorAll("[data-choice='salary-split']").forEach(button => {
        button.classList.toggle("selected", button.dataset.value === setupSalarySplit);
      });
    }

    const setupEdit = event.target.closest("[data-setup-category-edit]");
    if (setupEdit) {
      openSetupCategoryEditor(setupEdit.dataset.setupCategoryEdit);
      return;
    }

    const expenseButton = event.target.closest("[data-category-expense]");
    if (expenseButton) {
      openExpenseModal(expenseButton.dataset.categoryExpense);
      return;
    }

    const openCategory = event.target.closest("[data-category-open]");
    if (openCategory) {
      openCategoryDetails(openCategory.dataset.categoryOpen);
      return;
    }

    const settingsToggle = event.target.closest("[data-settings-toggle]");
    if (settingsToggle) {
      const panel = $(settingsToggle.dataset.settingsToggle);
      if (panel) panel.classList.toggle("hidden");
      return;
    }

    const editCategory = event.target.closest("[data-edit-category]");
    if (editCategory) {
      openCategoryEditor(editCategory.dataset.editCategory);
      return;
    }

    const categoryLimit = event.target.closest("[data-category-limit]");
    if (categoryLimit) {
      categoryEditorHasLimit = categoryLimit.dataset.categoryLimit === "yes";
      updateCategoryLimitInterface();
      return;
    }

    const settingsSplit = event.target.closest("[data-settings-salary-split]");
    if (settingsSplit) {
      settingsSalarySplit = settingsSplit.dataset.settingsSalarySplit;
      updateSalarySplitButtons();
      return;
    }

    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) {
      closeModal(closeButton.dataset.closeModal);
      return;
    }
  });

  const addEnterKeyHandler = (inputId, actionFn) => {
    $(inputId)?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        actionFn();
      }
    });
  };

  addEnterKeyHandler("unlock-password", unlockApplication);
  addEnterKeyHandler("expense-value", confirmExpense);
  addEnterKeyHandler("expense-description", confirmExpense);
  addEnterKeyHandler("extra-value", confirmExtra);
  addEnterKeyHandler("extra-description", confirmExtra);
  addEnterKeyHandler("reserve-value", confirmReserveSave);
  addEnterKeyHandler("withdraw-value", confirmReserveWithdraw);
  addEnterKeyHandler("confirm-new-password", saveNewPassword);
  addEnterKeyHandler("delete-confirmation", deleteAllData);

  $("lock-button")?.addEventListener("click", lockApplication);
  $("unlock-button")?.addEventListener("click", unlockApplication);

  $("add-extra-button")?.addEventListener("click", openExtraModal);
  $("confirm-extra-button")?.addEventListener("click", confirmExtra);

  $("reserve-save-button")?.addEventListener("click", showReserveSaveForm);
  $("reserve-withdraw-button")?.addEventListener("click", showWithdrawForm);
  $("confirm-reserve-button")?.addEventListener("click", confirmReserveSave);
  $("confirm-withdraw-button")?.addEventListener("click", confirmReserveWithdraw);

  $("confirm-expense-button")?.addEventListener("click", confirmExpense);

  $("settings-button")?.addEventListener("click", openSettings);
  $("settings-back-button")?.addEventListener("click", closeSettings);
  $("create-category-button")?.addEventListener("click", () => openCategoryEditor());
  $("save-category-button")?.addEventListener("click", saveCategoryFromEditor);
  $("save-salary-settings")?.addEventListener("click", saveSalarySettings);
  $("save-cycle-settings")?.addEventListener("click", saveCycleSettings);
  $("previous-cycle-button")?.addEventListener("click", openPreviousCycle);
  $("pizza-button")?.addEventListener("click", openPizza);

  $("master-key-button")?.addEventListener("click", () => {
    alert("A chave mestra (Fx020919) pode ser usada no lugar da sua senha a qualquer momento para desbloquear o app, alterar a senha ou autorizar a exclusão de dados.");
  });

  $("change-password-button")?.addEventListener("click", openPasswordModal);
  $("save-password-button")?.addEventListener("click", saveNewPassword);
  $("delete-all-data-button")?.addEventListener("click", openDeleteDataModal);
  $("confirm-delete-data-button")?.addEventListener("click", deleteAllData);

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".modal:not(.hidden)").forEach(modal => closeModal(modal.id));
    $("fx-pizza-modal")?.remove();
    $("fx-history-modal")?.remove();
  });
}

/* ============================================================
   EDITOR DE CATEGORIAS NO SETUP (EXCLUSIVAMENTE LIMITE)
   ============================================================ */

function openSetupCategoryEditor(categoryId) {
  const category = setupCategories.find(item => item.id === categoryId);
  if (!category) return;

  if (category.id === "reserve") {
    alert("A categoria Reserva é imutável.");
    return;
  }

  if (category.id === "other") {
    alert("A categoria Outros não possui limite de gastos.");
    return;
  }

  // No cadastro inicial, solicita EXCLUSIVAMENTE o limite de gastos.
  const limitInput = prompt(
    `Defina o limite para a categoria "${category.name}" (digite 0 para sem limite):`,
    category.hasLimit && category.limit !== null ? category.limit : 0
  );

  if (limitInput !== null) {
    const numericLimit = parseMoneyInput(limitInput);
    if (numericLimit > 0) {
      category.limit = numericLimit;
      category.hasLimit = true;
    } else {
      category.limit = null;
      category.hasLimit = false;
    }
  }

  renderSetupCategories();
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function createId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function cloneObject(object) {
  return JSON.parse(JSON.stringify(object));
}

function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function parseMoneyInput(value) {
  if (value === null || value === undefined) return 0;

  let text = String(value).trim();
  if (!text) return 0;

  text = text.replace(/\s/g, "");

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");

  if (hasComma && hasDot) {
    const commaIndex = text.lastIndexOf(",");
    const dotIndex = text.lastIndexOf(".");
    if (commaIndex > dotIndex) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (hasComma) {
    text = text.replace(",", ".");
  }

  const number = Number(text);
  if (!Number.isFinite(number)) return 0;

  return roundMoney(number);
}

function isZeroMoneyInput(value) {
  const text = String(value || "").trim();
  if (!text) return true;

  const normalized = text.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);

  return Number.isFinite(number) && number === 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(roundMoney(value));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/-- --:--";

  return (
    date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    }) +
    " — " +
    date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function showElement(id, message) {
  const element = $(id);
  if (!element) return;

  if (message !== undefined) element.textContent = message;
  element.classList.remove("hidden");
}

function hideElement(id) {
  const element = $(id);
  if (!element) return;
  element.classList.add("hidden");
}

function escapeHTML(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
