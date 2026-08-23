/* ============================================================
   FX.01 — Versão Completa e Corrigida (Matte Flow)
   ============================================================ */

"use strict";

const FX_VERSION = "FX.01";
const STORAGE_KEY = "fx01_data";
const MASTER_KEY = ["F", "x", "0", "2", "0", "9", "1", "9"].join("");

/* MAPA DE ÍCONES SVG PADRONIZADOS */
const CATEGORY_ICONS = {
  fixed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  reserve: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/></svg>`,
  medicine: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  leisure: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><rect width="20" height="12" x="2" y="6" rx="6"/></svg>`,
  phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>`,
  other: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>`
};

function getCategoryIconSvg(cat) {
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

let state = null;
let currentCategoryId = null;
let currentEditingCategoryId = null;
let currentEditingExpenseId = null;
let currentSetupStep = 1;
let setupSalarySplit = null;
let setupCategories = [];
let settingsSalarySplit = null;
let categoryEditorHasLimit = false;
let selectedReserveOrigin = null;

const $ = (id) => document.getElementById(id);

const screens = {
  setup: $("setup-screen"),
  lock: $("lock-screen"),
  main: $("main-screen"),
  settings: $("settings-screen")
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadApplication();
});

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
    console.error("Erro ao carregar os dados:", error);
    localStorage.removeItem(STORAGE_KEY);
    startInitialSetup();
  }
}

function normalizeState() {
  if (!state || typeof state !== "object") {
    state = createEmptyState();
    return;
  }
  if (!Array.isArray(state.categories)) state.categories = [];
  if (!Array.isArray(state.cycles)) state.cycles = [];
  if (!state.currentCycle) state.currentCycle = null;

  if (!state.reserve) state.reserve = { balance: 0 };
  state.reserve.balance = roundMoney(state.reserve.balance);

  if (!state.salary) state.salary = { reference: 0, split: false };
  state.salary.reference = roundMoney(state.salary.reference);

  if (!state.extra) state.extra = { balance: 0 };
  state.extra.balance = roundMoney(state.extra.balance);

  if (!state.security) state.security = { password: "", locked: false };
  if (!state.settings) state.settings = { cycleDay: 5 };

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

function startInitialSetup() {
  state = createEmptyState();
  setupCategories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  currentSetupStep = 1;
  setupSalarySplit = null;

  showScreen("setup");
  renderSetupStep();
}

function renderSetupStep() {
  document.querySelectorAll(".setup-step").forEach((step) => {
    const stepNumber = Number(step.dataset.step);
    step.classList.toggle("hidden", stepNumber !== currentSetupStep);
  });

  if (currentSetupStep === 6) {
    renderSetupCategories();
  }

  const button = $("setup-next-button");
  if (button) {
    button.textContent = currentSetupStep === 6 ? "Concluir" : "Continuar";
  }
}

function renderSetupCategories() {
  const container = $("setup-categories");
  if (!container) return;
  container.innerHTML = "";

  setupCategories.forEach((cat) => {
    const item = document.createElement("div");
    item.className = "settings-category-item";
    item.innerHTML = `
      <div class="settings-category-icon" style="color:var(--accent);">${getCategoryIconSvg(cat)}</div>
      <div class="settings-category-info">
        <div class="settings-category-name">${escapeHTML(cat.name)}</div>
        <div class="settings-category-limit">${cat.hasLimit && cat.limit ? `Limite: ${formatMoney(cat.limit)}` : "Sem limite"}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleSetupNext() {
  if (currentSetupStep === 1) {
    const val = $("setup-username")?.value.trim();
    if (!val) return alert("Digite seu nome de usuário.");
    state.user.name = val;
  }
  if (currentSetupStep === 2) {
    const val = $("setup-password")?.value;
    if (!val) return alert("Crie uma senha.");
    state.security.password = val;
  }
  if (currentSetupStep === 3) {
    const val = parseMoneyInput($("setup-salary")?.value);
    state.salary.reference = val;
  }
  if (currentSetupStep === 4) {
    if (!setupSalarySplit) return alert("Escolha uma opção.");
    state.salary.split = setupSalarySplit === "yes";
  }
  if (currentSetupStep === 5) {
    const day = Number($("setup-cycle-day")?.value);
    if (!day || day < 1 || day > 28) return alert("Dia entre 1 e 28.");
    state.settings.cycleDay = day;
  }

  if (currentSetupStep < 6) {
    currentSetupStep++;
    renderSetupStep();
    return;
  }

  completeInitialSetup();
}

function completeInitialSetup() {
  state.categories = setupCategories.map((c) => ({ ...c }));
  state.setupCompleted = true;
  state.security.locked = false;

  createInitialCycle();
  saveState();
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
  amount = roundMoney(amount);
  if (amount <= 0) throw new Error("O valor deve ser maior que zero.");

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
  renderApplication();
}

/* EDITAR E EXCLUIR GASTOS */
function openEditExpenseModal(expenseId) {
  const expense = state.currentCycle.expenses.find((e) => e.id === expenseId);
  if (!expense) return;

  currentEditingExpenseId = expenseId;

  $("edit-expense-value").value = expense.amount.toFixed(2);
  $("edit-expense-description").value = expense.description || "";
  $("edit-expense-origin").value = expense.origin;

  const catSelect = $("edit-expense-category");
  catSelect.innerHTML = "";
  state.categories.forEach((cat) => {
    if (cat.id !== "reserve") {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      if (cat.id === expense.categoryId) opt.selected = true;
      catSelect.appendChild(opt);
    }
  });

  hideElement("edit-expense-error");
  openModal("expense-edit-modal");
}

function saveExpenseEdit() {
  try {
    const expense = state.currentCycle.expenses.find((e) => e.id === currentEditingExpenseId);
    if (!expense) throw new Error("Gasto não encontrado.");

    const newAmount = parseMoneyInput($("edit-expense-value").value);
    const newOrigin = $("edit-expense-origin").value;
    const newCategory = $("edit-expense-category").value;
    const newDesc = $("edit-expense-description").value.trim();

    if (newAmount <= 0) throw new Error("O valor deve ser maior que zero.");

    let virtualSalaryBal = getSalaryBalance();
    let virtualExtraBal = getExtraBalance();

    if (expense.origin === "salary") virtualSalaryBal += expense.amount;
    else if (expense.origin === "extra") virtualExtraBal += expense.amount;

    const availableForTarget = newOrigin === "salary" ? virtualSalaryBal : virtualExtraBal;

    if (newAmount > availableForTarget) {
      throw new Error("Saldo insuficiente para esta alteração.");
    }

    if (expense.origin === "extra") {
      state.extra.balance = roundMoney(state.extra.balance + expense.amount);
    }
    if (newOrigin === "extra") {
      state.extra.balance = roundMoney(state.extra.balance - newAmount);
    }

    expense.amount = newAmount;
    expense.origin = newOrigin;
    expense.categoryId = newCategory;
    expense.description = newDesc;

    normalizeCycle(state.currentCycle);
    saveState();
    closeModal("expense-edit-modal");
    renderApplication();
  } catch (err) {
    showElement("edit-expense-error", err.message);
  }
}

function deleteExpense() {
  if (!currentEditingExpenseId) return;

  if (!confirm("Tem certeza que deseja excluir este gasto?")) return;

  const index = state.currentCycle.expenses.findIndex((e) => e.id === currentEditingExpenseId);
  if (index === -1) return;

  const expense = state.currentCycle.expenses[index];

  if (expense.origin === "extra") {
    state.extra.balance = roundMoney(state.extra.balance + expense.amount);
  }

  state.currentCycle.expenses.splice(index, 1);
  normalizeCycle(state.currentCycle);

  saveState();
  closeModal("expense-edit-modal");
  renderApplication();
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
        Total Lançado: <strong>${formatMoney(usage)}</strong>
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
          <span class="expense-item-amount">${formatMoney(exp.amount)}</span>
        </div>
      `;
    });
  }

  html += `</div>`;
  container.innerHTML = html;
  openModal("category-modal");
}

/* RESERVA */
function openReserveModal() {
  if ($("reserve-value")) $("reserve-value").value = "";
  if ($("withdraw-value")) $("withdraw-value").value = "";

  selectedReserveOrigin = null;
  hideElement("reserve-error");
  hideElement("reserve-form");
  hideElement("withdraw-form");
  hideElement("reserve-origin-section");

  document.querySelectorAll("[data-reserve-origin]").forEach((btn) => btn.classList.remove("selected"));
  setText("selected-reserve-origin", "");
  setText("reserve-balance", formatMoney(getReserveBalance()));

  openModal("reserve-modal");
}

function showReserveSaveForm() {
  hideElement("withdraw-form");
  showElement("reserve-form");
  showElement("reserve-origin-section");
  setText("reserve-salary-available", formatMoney(getSalaryBalance()));
  setText("reserve-extra-available", formatMoney(getExtraBalance()));
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
    saveState();
    closeModal("reserve-modal");
    renderApplication();
  } catch (err) {
    showElement("reserve-error", err.message);
  }
}

/* GRÁFICO DO MÊS */
function openChartModal() {
  const container = $("chart-container");
  if (!container) return;

  const totals = state.categories
    .map((c) => ({ name: c.name, icon: getCategoryIconSvg(c), value: state.currentCycle.categoryUsage[c.id] || 0 }))
    .filter((c) => c.value > 0);

  const totalSum = totals.reduce((acc, curr) => acc + curr.value, 0);

  if (!totals.length || totalSum <= 0) {
    return alert("Ainda não existem gastos lançados no ciclo.");
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
      <strong>${formatMoney(s.value)} (${s.pct.toFixed(1)}%)</strong>
    </div>
  `
    )
    .join("");

  container.innerHTML = `
    <div class="pizza-chart" style="background: conic-gradient(${gradient}); position:relative; margin: 0 auto;">
      <div style="position:absolute; inset:25%; background:var(--surface); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800;">
        ${formatMoney(totalSum)}
      </div>
    </div>
    <div class="pizza-legend">${legendHTML}</div>
  `;

  openModal("chart-modal");
}

/* CONFIGURAÇÕES DE SALÁRIO E SEGURANÇA */
function saveSalarySettings() {
  const raw = $("settings-salary")?.value;
  const salary = parseMoneyInput(raw);

  if (salary < 0) return alert("Salário não pode ser negativo.");

  state.salary.reference = salary;
  state.salary.split = settingsSalarySplit === "yes";

  if (state.currentCycle) {
    const leftover = Number(state.currentCycle.leftoverSalary) || 0;
    state.currentCycle.salaryReceived = roundMoney(salary + leftover);
  }

  saveState();
  renderApplication();
  alert("Salário salvo com sucesso.");
}

function saveCycleSettings() {
  const newDay = Number($("settings-cycle-day")?.value);
  if (!Number.isInteger(newDay) || newDay < 1 || newDay > 28) return alert("Dia entre 1 e 28.");

  state.settings.cycleDay = newDay;
  saveState();
  alert("Alteração será aplicada no próximo ciclo.");
}

function saveNewPassword() {
  const current = $("current-password")?.value;
  const newPass = $("new-password")?.value;
  const confirmPass = $("confirm-new-password")?.value;

  if (current !== state.security.password && current !== MASTER_KEY) {
    return showElement("password-error", "Senha atual incorreta.");
  }
  if (!newPass) return showElement("password-error", "Digite a nova senha.");
  if (newPass !== confirmPass) return showElement("password-error", "Senhas não coincidem.");

  state.security.password = newPass;
  saveState();
  closeModal("password-modal");
  alert("Senha alterada com sucesso.");
}

function deleteAllData() {
  const pass = $("delete-password")?.value;
  const confirmText = $("delete-confirmation")?.value.trim();

  if (pass !== state.security.password && pass !== MASTER_KEY) {
    return showElement("delete-error", "Senha incorreta.");
  }
  if (confirmText !== "APAGAR") {
    return showElement("delete-error", "Digite APAGAR para confirmar.");
  }

  localStorage.removeItem(STORAGE_KEY);
  state = null;
  closeModal("delete-data-modal");
  startInitialSetup();
}

/* RENDERIZAÇÃO */
function renderApplication() {
  if (!state) return;
  renderBalances();
  renderCategories();
  renderExpensesGrouped();
  renderSettingsValues();
}

function renderBalances() {
  const salary = getSalaryBalance();
  const extra = getExtraBalance();
  const available = roundMoney(salary + extra);

  setText("salary-balance", formatMoney(salary));
  setText("extra-balance", formatMoney(extra));
  setText("available-balance", formatMoney(available));
  setText("reserve-balance", formatMoney(getReserveBalance()));
}

function renderCategories() {
  const container = $("categories-list");
  if (!container) return;
  container.innerHTML = "";

  state.categories.forEach((cat) => {
    const card = document.createElement("div");
    card.className = "category-card";

    const usage = state.currentCycle.categoryUsage[cat.id] || 0;
    let balanceText = "Sem limite";

    if (cat.id === "reserve") balanceText = formatMoney(getReserveBalance());
    else if (cat.hasLimit && cat.limit !== null) balanceText = formatMoney(Math.max(0, cat.limit - usage));
    else if (cat.id === "other") balanceText = formatMoney(usage);

    card.innerHTML = `
      <div class="category-main" data-category-expense="${cat.id}">
        <div class="category-top">
          <span class="category-name" style="display:flex; align-items:center; gap:8px;">
            ${getCategoryIconSvg(cat)}
            ${escapeHTML(cat.name)}
          </span>
          <span class="category-balance">${balanceText}</span>
        </div>
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

      itemsHTML += `
        <div class="expense-item-card" data-edit-expense-id="${exp.id}">
          <div class="expense-item-left">
            <div class="expense-item-icon" style="color:var(--accent);">${getCategoryIconSvg(cat)}</div>
            <div class="expense-item-details">
              <span class="expense-item-title">${escapeHTML(exp.description || catName)}</span>
              <div class="expense-item-sub">
                <span class="expense-origin-badge ${exp.origin === "salary" ? "badge-salary" : "badge-extra"}">${exp.origin === "salary" ? "Salário" : "Extra"}</span>
                <span class="expense-item-time">${new Date(exp.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>
          <span class="expense-item-amount">${formatMoney(exp.amount)}</span>
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
  if ($("settings-salary")) $("settings-salary").value = Number(state.salary.reference).toFixed(2);
  if ($("settings-cycle-day")) $("settings-cycle-day").value = state.settings.cycleDay;
  settingsSalarySplit = state.salary.split ? "yes" : "no";
  updateSalarySplitButtons();
}

function updateSalarySplitButtons() {
  document.querySelectorAll("[data-settings-salary-split]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.settingsSalarySplit === settingsSalarySplit);
  });
  $("salary-split-info")?.classList.toggle("hidden", settingsSalarySplit !== "yes");
}

/* PARSER DE VALORES */
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
    if (commaIndex > dotIndex) text = text.replace(/\./g, "").replace(",", ".");
    else text = text.replace(/,/g, "");
  } else if (hasComma) {
    text = text.replace(",", ".");
  }

  const number = Number(text);
  return Number.isFinite(number) ? roundMoney(number) : 0;
}

/* DELEGAÇÃO COMPLETA DE EVENTOS */
function bindEvents() {
  $("setup-next-button")?.addEventListener("click", handleSetupNext);
  $("nav-home-button")?.addEventListener("click", () => switchTab("home"));
  $("nav-extrato-button")?.addEventListener("click", () => switchTab("extrato"));

  $("toggle-lock-password")?.addEventListener("click", () => {
    const input = $("unlock-password");
    if (input.type === "password") {
      input.type = "text";
      $("eye-icon").textContent = "🙈";
    } else {
      input.type = "password";
      $("eye-icon").textContent = "👁️";
    }
  });

  document.addEventListener("click", (e) => {
    // 1. SIM / NÃO DO SETUP (DIVISÃO DO SALÁRIO)
    const setupSplitBtn = e.target.closest("[data-choice='salary-split']");
    if (setupSplitBtn) {
      setupSalarySplit = setupSplitBtn.dataset.value;
      document.querySelectorAll("[data-choice='salary-split']").forEach((btn) => {
        btn.classList.toggle("selected", btn.dataset.value === setupSalarySplit);
      });
      return;
    }

    // 2. SIM / NÃO DO EDITOR DE CATEGORIA (LIMITE)
    const categoryLimitBtn = e.target.closest("[data-category-limit]");
    if (categoryLimitBtn) {
      categoryEditorHasLimit = categoryLimitBtn.dataset.categoryLimit === "yes";
      document.querySelectorAll("[data-category-limit]").forEach((btn) => {
        btn.classList.toggle("selected", btn.dataset.categoryLimit === (categoryEditorHasLimit ? "yes" : "no"));
      });
      $("category-limit-value-container")?.classList.toggle("hidden", !categoryEditorHasLimit);
      return;
    }

    // 3. ACCORDION DAS CONFIGURAÇÕES
    const settingsToggle = e.target.closest("[data-settings-toggle]");
    if (settingsToggle) {
      const panel = $(settingsToggle.dataset.settingsToggle);
      if (panel) panel.classList.toggle("hidden");
      return;
    }

    // 4. ORIGEM DA RESERVA
    const reserveOriginBtn = e.target.closest("[data-reserve-origin]");
    if (reserveOriginBtn) {
      selectedReserveOrigin = reserveOriginBtn.dataset.reserveOrigin;
      document.querySelectorAll("[data-reserve-origin]").forEach((btn) => {
        btn.classList.toggle("selected", btn.dataset.reserveOrigin === selectedReserveOrigin);
      });
      setText("selected-reserve-origin", `Origem: ${selectedReserveOrigin === "salary" ? "Salário" : "Extra"}`);
      return;
    }

    // 5. DIVISÃO DO SALÁRIO NAS CONFIGURAÇÕES
    const settingsSplit = e.target.closest("[data-settings-salary-split]");
    if (settingsSplit) {
      settingsSalarySplit = settingsSplit.dataset.settingsSalarySplit;
      updateSalarySplitButtons();
      return;
    }

    // 6. ABRIR DETALHES DE CATEGORIA
    const openCatBtn = e.target.closest("[data-category-open]");
    if (openCatBtn) {
      openCategoryDetails(openCatBtn.dataset.categoryOpen);
      return;
    }

    // 7. ABRIR EDIÇÃO DE GASTO
    const editItem = e.target.closest("[data-edit-expense-id]");
    if (editItem) {
      closeModal("category-modal");
      openEditExpenseModal(editItem.dataset.editExpenseId);
      return;
    }

    // 8. LANÇAR GASTO NA CATEGORIA
    const catExpense = e.target.closest("[data-category-expense]");
    if (catExpense) {
      openExpenseModal(catExpense.dataset.categoryExpense);
      return;
    }

    // 9. FECHAR MODAIS
    const closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      closeModal(closeBtn.dataset.closeModal);
      return;
    }
  });

  $("unlock-button")?.addEventListener("click", () => {
    const pass = $("unlock-password")?.value;
    if (pass === state.security.password || pass === MASTER_KEY) {
      state.security.locked = false;
      saveState();
      showScreen("main");
      renderApplication();
    } else {
      showElement("unlock-error", "Senha incorreta.");
    }
  });

  // Eventos de Ação nos Modais
  $("add-extra-button")?.addEventListener("click", () => openModal("extra-modal"));
  $("confirm-extra-button")?.addEventListener("click", () => {
    const val = parseMoneyInput($("extra-value")?.value);
    if (val <= 0) return showElement("extra-error", "Valor inválido.");

    state.extra.balance = roundMoney(state.extra.balance + val);
    saveState();
    closeModal("extra-modal");
    renderApplication();
  });

  $("confirm-expense-button")?.addEventListener("click", () => {
    try {
      const val = parseMoneyInput($("expense-value").value);
      const origin = $("expense-origin").value;
      const desc = $("expense-description").value;
      launchExpense(currentCategoryId, val, origin, desc);
      closeModal("expense-modal");
    } catch (err) {
      showElement("expense-error", err.message);
    }
  });

  $("save-expense-edit-button")?.addEventListener("click", saveExpenseEdit);
  $("delete-expense-button")?.addEventListener("click", deleteExpense);

  // Eventos da Reserva
  $("reserve-save-button")?.addEventListener("click", showReserveSaveForm);
  $("reserve-withdraw-button")?.addEventListener("click", showWithdrawForm);
  $("confirm-reserve-button")?.addEventListener("click", confirmReserveSave);
  $("confirm-withdraw-button")?.addEventListener("click", confirmReserveWithdraw);

  // Eventos de Configuração
  $("save-salary-settings")?.addEventListener("click", saveSalarySettings);
  $("save-cycle-settings")?.addEventListener("click", saveCycleSettings);
  $("change-password-button")?.addEventListener("click", () => openModal("password-modal"));
  $("save-password-button")?.addEventListener("click", saveNewPassword);
  $("delete-all-data-button")?.addEventListener("click", () => openModal("delete-data-modal"));
  $("confirm-delete-data-button")?.addEventListener("click", deleteAllData);

  // Navegação
  $("chart-button")?.addEventListener("click", openChartModal);
  $("settings-button")?.addEventListener("click", () => showScreen("settings"));
  $("settings-back-button")?.addEventListener("click", () => showScreen("main"));
  $("lock-button")?.addEventListener("click", () => {
    state.security.locked = true;
    saveState();
    showScreen("lock");
  });
}

function switchTab(tab) {
  $("tab-home").classList.toggle("hidden", tab !== "home");
  $("tab-extrato").classList.toggle("hidden", tab !== "extrato");
  $("nav-home-button").classList.toggle("active", tab === "home");
  $("nav-extrato-button").classList.toggle("active", tab === "extrato");
}

function openExpenseModal(catId) {
  currentCategoryId = catId;
  const cat = state.categories.find((c) => c.id === catId);
  if ($("expense-modal-title")) $("expense-modal-title").textContent = `Lançar em ${cat?.name || ""}`;
  $("expense-value").value = "";
  $("expense-description").value = "";
  hideElement("expense-error");
  openModal("expense-modal");
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s?.classList.add("hidden"));
  screens[name]?.classList.remove("hidden");
}

function openModal(id) { $(id)?.classList.remove("hidden"); }
function closeModal(id) { $(id)?.classList.add("hidden"); }

function roundMoney(v) { return Math.round((Number(v) + Number.EPSILON) * 100) / 100; }
function formatMoney(v) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); }
function setText(id, txt) { if ($(id)) $(id).textContent = txt; }
function showElement(id, msg) { const el = $(id); if (el) { if (msg) el.textContent = msg; el.classList.remove("hidden"); } }
function hideElement(id) { $(id)?.classList.add("hidden"); }
function escapeHTML(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function createId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
