/* ============================================================
   FX.01
   Lógica principal do aplicativo
   ============================================================ */

"use strict";


/* ============================================================
   CONFIGURAÇÕES FIXAS
   ============================================================ */

const FX_VERSION = "FX.01";

const STORAGE_KEY = "fx01_data";

const MASTER_KEY = "Fx020919";

const DEFAULT_CATEGORIES = [
  {
    id: "fixed",
    name: "Gasto Fixo",
    icon: "🏠",
    hasLimit: true,
    limit: 0,
    protected: true
  },
  {
    id: "reserve",
    name: "Reserva",
    icon: "💰",
    hasLimit: false,
    limit: null,
    protected: true
  },
  {
    id: "medicine",
    name: "Medicamentos",
    icon: "💊",
    hasLimit: true,
    limit: 0,
    protected: true
  },
  {
    id: "leisure",
    name: "Lazer",
    icon: "🎮",
    hasLimit: true,
    limit: 0,
    protected: true
  },
  {
    id: "phone",
    name: "Celular",
    icon: "📱",
    hasLimit: true,
    limit: 0,
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
   ESTADO TEMPORÁRIO DA INTERFACE
   ============================================================ */

let state = null;

let currentCategoryId = null;

let currentEditingCategoryId = null;

let currentSetupStep = 1;

let setupSalarySplit = null;

let setupCategories = [];

let settingsSalarySplit = null;

let categoryEditorHasLimit = null;


/* ============================================================
   ELEMENTOS
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
   ARMAZENAMENTO
   ============================================================ */

function saveState() {

  if (!state) {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

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

    console.error(
      "Erro ao carregar os dados do FX:",
      error
    );

    localStorage.removeItem(STORAGE_KEY);

    startInitialSetup();

  }

}


/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

function normalizeState() {

  if (!state || typeof state !== "object") {

    state = createEmptyState();

    return;
  }

  if (!Array.isArray(state.categories)) {
    state.categories = [];
  }

  if (!Array.isArray(state.cycles)) {
    state.cycles = [];
  }

  if (!state.currentCycle) {
    state.currentCycle = null;
  }

  if (!state.reserve) {
    state.reserve = {
      balance: 0
    };
  }

  if (!Number.isFinite(Number(state.reserve.balance))) {
    state.reserve.balance = 0;
  }

  if (!state.salary) {

    state.salary = {
      reference: 0,
      split: false
    };

  }

  if (!state.extra) {

    state.extra = {
      balance: 0
    };

  }

  if (!state.security) {

    state.security = {
      password: "",
      locked: false
    };

  }

  if (!state.settings) {

    state.settings = {
      cycleDay: 5
    };

  }

  /*
   * Garante que as categorias protegidas continuem
   * identificadas corretamente mesmo em dados antigos.
   */

  state.categories.forEach(category => {

    if (
      category.id === "reserve" ||
      category.id === "other" ||
      category.id === "fixed" ||
      category.id === "medicine" ||
      category.id === "leisure" ||
      category.id === "phone"
    ) {

      category.protected = true;

    }

    if (category.id === "reserve") {

      category.hasLimit = false;
      category.limit = null;

    }

    if (category.id === "other") {

      category.hasLimit = false;
      category.limit = null;

    }

  });


  if (
    state.currentCycle &&
    !state.currentCycle.categoryUsage
  ) {

    state.currentCycle.categoryUsage = {};

  }


  if (
    state.currentCycle &&
    Array.isArray(state.categories)
  ) {

    state.categories.forEach(category => {

      if (
        !Number.isFinite(
          Number(
            state.currentCycle.categoryUsage[
              category.id
            ]
          )
        )
      ) {

        state.currentCycle.categoryUsage[
          category.id
        ] = 0;

      }

    });

  }

}


function createEmptyState() {

  return {

    version: FX_VERSION,

    setupCompleted: false,

    user: {
      name: ""
    },

    security: {
      password: "",
      locked: false
    },

    salary: {
      reference: 0,
      split: false
    },

    extra: {
      balance: 0
    },

    reserve: {
      balance: 0
    },

    settings: {
      cycleDay: 5
    },

    categories: [],

    cycles: [],

    currentCycle: null

  };

}


/* ============================================================
   CONFIGURAÇÃO INICIAL
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

  return DEFAULT_CATEGORIES.map(category => ({
    ...category
  }));

}


function renderSetupStep() {

  const steps = document.querySelectorAll(
    ".setup-step"
  );

  steps.forEach(step => {

    const stepNumber = Number(
      step.dataset.step
    );

    step.classList.toggle(
      "hidden",
      stepNumber !== currentSetupStep
    );

  });


  if (currentSetupStep === 6) {

    renderSetupCategories();

  }


  const button = $("setup-next-button");

  if (!button) {
    return;
  }

  button.textContent =
    currentSetupStep === 6
      ? "Concluir configuração"
      : "Continuar";

}


function renderSetupCategories() {

  const container = $("setup-categories");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  setupCategories.forEach(category => {

    const item = document.createElement("div");

    item.className =
      "settings-category-item";

    item.innerHTML = `
      <div class="settings-category-icon">
        ${escapeHTML(category.icon)}
      </div>

      <div class="settings-category-info">

        <div class="settings-category-name">
          ${escapeHTML(category.name)}
        </div>

        <div class="settings-category-limit">
          ${
            category.hasLimit
              ? `Limite: ${formatMoney(category.limit)}`
              : "Sem limite"
          }
        </div>

      </div>

      <button
        type="button"
        class="settings-category-edit"
        data-setup-category-edit="${category.id}"
      >
        ✏️
      </button>
    `;

    container.appendChild(item);

  });

}


function handleSetupNext() {

  if (currentSetupStep === 1) {

    const username =
      $("setup-username").value.trim();

    if (!username) {

      showSetupError(
        "Digite um nome de usuário."
      );

      return;
    }

    state.user.name = username;

  }


  if (currentSetupStep === 2) {

    const password =
      $("setup-password").value;

    if (!password) {

      showSetupError(
        "Crie uma senha."
      );

      return;
    }

    state.security.password = password;

  }


  if (currentSetupStep === 3) {

    const salary =
      parseMoneyInput(
        $("setup-salary").value
      );

    if (salary < 0) {

      showSetupError(
        "O salário não pode ser negativo."
      );

      return;
    }

    state.salary.reference = salary;

  }


  if (currentSetupStep === 4) {

    if (setupSalarySplit === null) {

      showSetupError(
        "Escolha se deseja dividir o salário."
      );

      return;
    }

    state.salary.split =
      setupSalarySplit === "yes";

  }


  if (currentSetupStep === 5) {

    const day =
      Number(
        $("setup-cycle-day").value
      );

    if (
      !Number.isInteger(day) ||
      day < 1 ||
      day > 28
    ) {

      showSetupError(
        "O dia do ciclo deve estar entre 1 e 28."
      );

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

  state.categories =
    setupCategories.map(category => ({
      ...category,

      cycleUsage: 0
    }));

  state.setupCompleted = true;

  state.security.locked = false;

  createInitialCycle();

  saveState();

  showScreen("main");

  renderApplication();

}


function createInitialCycle() {

  const now = new Date();

  const cycleStart =
    calculateCurrentCycleStart(
      now,
      state.settings.cycleDay
    );

  state.currentCycle = {

    id: createId(),

    startDate:
      cycleStart.toISOString(),

    endDate:
      calculateNextCycleStart(
        cycleStart,
        state.settings.cycleDay
      ).toISOString(),

    salaryAdded: false,

    salaryReceived:
      roundMoney(state.salary.reference),

    extraAtStart:
      roundMoney(state.extra.balance),

    expenses: [],

    categoryUsage: {}

  };


  state.categories.forEach(category => {

    state.currentCycle.categoryUsage[
      category.id
    ] = 0;

  });

}


/* ============================================================
   CICLOS
   ============================================================ */

function calculateCurrentCycleStart(
  date,
  cycleDay
) {

  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  if (result.getDate() < cycleDay) {

    result.setMonth(
      result.getMonth() - 1
    );

  }

  result.setDate(cycleDay);

  return result;

}


function calculateNextCycleStart(
  startDate,
  cycleDay
) {

  const result =
    new Date(startDate);

  result.setMonth(
    result.getMonth() + 1
  );

  result.setDate(cycleDay);

  return result;

}


function ensureCurrentCycle() {

  if (!state.currentCycle) {

    createInitialCycle();

    saveState();

    return;

  }

  const now = new Date();

  const nextStart =
    new Date(
      state.currentCycle.endDate
    );

  if (now < nextStart) {

    return;
  }

  startNewCycle();

}


function startNewCycle() {

  const previousCycle =
    cloneObject(
      state.currentCycle
    );

  state.cycles.push(
    previousCycle
  );


  const newStart =
    new Date(
      previousCycle.endDate
    );

  const newEnd =
    calculateNextCycleStart(
      newStart,
      state.settings.cycleDay
    );


  state.currentCycle = {

    id: createId(),

    startDate:
      newStart.toISOString(),

    endDate:
      newEnd.toISOString(),

    salaryAdded: false,

    salaryReceived:
      roundMoney(
        state.salary.reference
      ),

    extraAtStart:
      roundMoney(
        state.extra.balance
      ),

    expenses: [],

    categoryUsage: {}

  };


  state.categories.forEach(category => {

    state.currentCycle.categoryUsage[
      category.id
    ] = 0;

  });


  addSalaryToCurrentCycle();

  saveState();

}


/* ============================================================
   SALÁRIO
   ============================================================ */

function addSalaryToCurrentCycle() {

  if (!state.currentCycle) {
    return;
  }

  if (state.currentCycle.salaryAdded) {
    return;
  }

  const amount =
    roundMoney(
      state.salary.reference
    );

  state.currentCycle.salaryReceived =
    amount;

  state.currentCycle.salaryAdded = true;

  state.currentCycle.salaryEntryDate =
    new Date().toISOString();

}


function getSalaryBalance() {

  if (!state.currentCycle) {
    return 0;
  }

  let balance =
    Number(
      state.currentCycle.salaryReceived || 0
    );

  state.currentCycle.expenses.forEach(
    expense => {

      if (expense.origin === "salary") {

        balance -= expense.amount;

      }

    }
  );

  return roundMoney(
    Math.max(0, balance)
  );

}


/* ============================================================
   EXTRA
   ============================================================ */

function addExtra(amount, description) {

  amount =
    roundMoney(amount);

  if (amount <= 0) {

    throw new Error(
      "O valor do Extra deve ser maior que zero."
    );

  }

  state.extra.balance =
    roundMoney(
      state.extra.balance + amount
    );

  saveState();

  renderApplication();

}


function getExtraBalance() {

  if (!state.currentCycle) {

    return roundMoney(
      state.extra.balance
    );

  }

  let balance =
    Number(
      state.extra.balance
    );

  state.currentCycle.expenses.forEach(
    expense => {

      if (expense.origin === "extra") {

        balance -= expense.amount;

      }

    }
  );

  return roundMoney(
    Math.max(0, balance)
  );

}


/* ============================================================
   RESERVA
   ============================================================ */

function getReserveBalance() {

  if (!state || !state.reserve) {
    return 0;
  }

  return roundMoney(
    state.reserve.balance
  );

}


function saveToReserve(
  origin,
  amount
) {

  amount =
    roundMoney(amount);

  if (amount <= 0) {

    throw new Error(
      "O valor deve ser maior que zero."
    );

  }

  const available =
    getOriginBalance(origin);

  if (amount > available) {

    throw new Error(
      "Não existe dinheiro suficiente nessa origem."
    );

  }

  if (origin === "salary") {

    createExpenseRecord(
      "salary",
      amount,
      "Transferência para Reserva",
      "salary-to-reserve"
    );

  } else if (origin === "extra") {

    createExpenseRecord(
      "extra",
      amount,
      "Transferência para Reserva",
      "extra-to-reserve"
    );

  } else {

    throw new Error(
      "Origem inválida para a Reserva."
    );

  }

  state.reserve.balance =
    roundMoney(
      state.reserve.balance + amount
    );

  saveState();

  renderApplication();

}


function withdrawFromReserve(amount) {

  amount =
    roundMoney(amount);

  if (amount <= 0) {

    throw new Error(
      "O valor deve ser maior que zero."
    );

  }

  if (
    amount >
    state.reserve.balance
  ) {

    throw new Error(
      "Não existe saldo suficiente na Reserva."
    );

  }

  state.reserve.balance =
    roundMoney(
      state.reserve.balance - amount
    );


  createExpenseRecord(
    "reserve",
    amount,
    "Retirada da reserva",
    "reserve-withdrawal"
  );


  saveState();

  renderApplication();

}


/* ============================================================
   ORIGENS
   ============================================================ */

function getOriginBalance(origin) {

  if (origin === "salary") {

    return getSalaryBalance();

  }

  if (origin === "extra") {

    return getExtraBalance();

  }

  if (origin === "reserve") {

    return getReserveBalance();

  }

  return 0;

}


/* ============================================================
   GASTOS
   ============================================================ */

function launchExpense(
  categoryId,
  amount,
  origin,
  description
) {

  amount =
    roundMoney(amount);

  if (amount <= 0) {

    throw new Error(
      "O valor deve ser maior que zero."
    );

  }

  const category =
    findCategory(categoryId);

  if (!category) {

    throw new Error(
      "Categoria não encontrada."
    );

  }

  if (
    category.id === "reserve"
  ) {

    throw new Error(
      "A Reserva possui uma operação própria."
    );

  }

  const available =
    getOriginBalance(origin);

  if (amount > available) {

    throw new Error(
      "O valor é maior que o saldo disponível da origem."
    );

  }


  if (
    category.hasLimit
  ) {

    const used =
      getCategoryUsage(
        category.id
      );

    const remaining =
      roundMoney(
        category.limit - used
      );

    if (amount > remaining) {

      throw new Error(
        "Esse gasto ultrapassa o limite da categoria."
      );

    }

  }


  createExpenseRecord(
    origin,
    amount,
    description,
    category.id
  );


  if (
    !state.currentCycle.categoryUsage[
      category.id
    ]
  ) {

    state.currentCycle.categoryUsage[
      category.id
    ] = 0;

  }


  state.currentCycle.categoryUsage[
    category.id
  ] =
    roundMoney(
      state.currentCycle.categoryUsage[
        category.id
      ] + amount
    );


  saveState();

  renderApplication();

}


function createExpenseRecord(
  origin,
  amount,
  description,
  type
) {

  const expense = {

    id: createId(),

    origin,

    amount:
      roundMoney(amount),

    description:
      description ||
      "",

    type,

    categoryId:
      type === "reserve-withdrawal"
        ? "other"
        : type === "salary-to-reserve"
          ? "reserve"
          : type === "extra-to-reserve"
            ? "reserve"
            : type,

    date:
      new Date().toISOString()

  };


  if (
    !state.currentCycle.expenses
  ) {

    state.currentCycle.expenses = [];

  }


  state.currentCycle.expenses.push(
    expense
  );

}


function getCategoryUsage(categoryId) {

  if (
    !state.currentCycle ||
    !state.currentCycle.categoryUsage
  ) {

    return 0;

  }

  return roundMoney(
    state.currentCycle.categoryUsage[
      categoryId
    ] || 0
  );

}


function getCategoryBalance(category) {

  if (!category) {
    return 0;
  }

  if (!category.hasLimit) {

    return null;

  }

  const usage =
    getCategoryUsage(
      category.id
    );

  return roundMoney(
    Math.max(
      0,
      category.limit - usage
    )
  );

}


/* ============================================================
   SALDO PRINCIPAL
   ============================================================ */

function getAvailableBalance() {

  return roundMoney(
    getSalaryBalance() +
    getExtraBalance()
  );

}


/* ============================================================
   CATEGORIAS
   ============================================================ */

function findCategory(id) {

  return state.categories.find(
    category =>
      category.id === id
  );

}


function createCategory(
  name,
  icon,
  hasLimit,
  limit
) {

  const cleanName =
    name.trim();

  if (!cleanName) {

    throw new Error(
      "Digite o nome da categoria."
    );

  }

  const category = {

    id:
      "custom-" +
      createId(),

    name:
      cleanName,

    icon:
      icon.trim() || "📁",

    hasLimit:
      Boolean(hasLimit),

    limit:
      hasLimit
        ? roundMoney(limit)
        : null,

    protected:
      false

  };


  state.categories.push(
    category
  );


  if (
    state.currentCycle &&
    state.currentCycle.categoryUsage
  ) {

    state.currentCycle.categoryUsage[
      category.id
    ] = 0;

  }


  saveState();

  renderApplication();

}


function updateCategory(
  categoryId,
  name,
  icon,
  hasLimit,
  limit
) {

  const category =
    findCategory(
      categoryId
    );

  if (!category) {

    throw new Error(
      "Categoria não encontrada."
    );

  }


  /*
   * RESERVA É IMUTÁVEL.
   * Não permite alterar nome, ícone,
   * limite ou qualquer outra propriedade.
   */

  if (
    category.id === "reserve"
  ) {

    throw new Error(
      "A categoria Reserva é protegida e não pode ser editada."
    );

  }


  /*
   * OUTROS também permanece sem limite.
   */

  if (
    category.id === "other"
  ) {

    category.name =
      name.trim() || category.name;

    category.icon =
      icon.trim() || category.icon;

    category.hasLimit = false;

    category.limit = null;

  } else {

    category.name =
      name.trim() || category.name;

    category.icon =
      icon.trim() || category.icon;

    category.hasLimit =
      Boolean(hasLimit);

    category.limit =
      hasLimit
        ? roundMoney(limit)
        : null;

  }


  saveState();

  renderApplication();

}


/* ============================================================
   INTERFACE PRINCIPAL
   ============================================================ */

function renderApplication() {

  if (!state) {
    return;
  }

  ensureCurrentCycle();

  renderBalances();

  renderCategories();

  renderExpenses();

  renderSettingsCategories();

  renderSettingsValues();

}


function renderBalances() {

  const salary =
    getSalaryBalance();

  const extra =
    getExtraBalance();

  const available =
    salary + extra;


  setText(
    "salary-balance",
    formatMoney(salary)
  );

  setText(
    "extra-balance",
    formatMoney(extra)
  );

  setText(
    "available-balance",
    formatMoney(available)
  );

  setText(
    "reserve-balance",
    formatMoney(
      getReserveBalance()
    )
  );

}


function renderCategories() {

  const container =
    $("categories-list");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  state.categories.forEach(
    category => {

      const card =
        document.createElement("div");

      card.className =
        "category-card";


      const balance =
        getCategoryBalance(
          category
        );


      const usage =
        getCategoryUsage(
          category.id
        );


      let progressHTML = "";


      if (
        category.hasLimit
      ) {

        const percentage =
          category.limit > 0
            ? Math.min(
                100,
                (usage /
                  category.limit) *
                  100
              )
            : 0;

        const full =
          percentage >= 100;

        progressHTML = `
          <div class="category-progress">

            <div
              class="category-progress-bar ${
                full ? "full" : ""
              }"
              style="width:${percentage}%"
            ></div>

          </div>
        `;

      }


      /*
       * RESERVA:
       * mostra o saldo real da reserva.
       */

      let balanceText;

      if (
        category.id === "reserve"
      ) {

        balanceText =
          formatMoney(
            getReserveBalance()
          );

      }

      /*
       * OUTROS:
       * não tem limite, mas agora mostra
       * o total já lançado no ciclo.
       */

      else if (
        category.id === "other"
      ) {

        balanceText =
          formatMoney(
            usage
          );

      }

      /*
       * Categorias com limite:
       * mostram quanto ainda está disponível.
       */

      else if (
        category.hasLimit
      ) {

        balanceText =
          formatMoney(
            balance
          );

      }

      /*
       * Categorias sem limite criadas pelo usuário:
       * mostram o total lançado.
       */

      else {

        balanceText =
          formatMoney(
            usage
          );

      }


      card.innerHTML = `

        <div
          class="category-main"
          data-category-expense="${category.id}"
        >

          <div class="category-top">

            <span class="category-name">
              ${escapeHTML(category.name)}
            </span>

            <span class="category-balance">
              ${balanceText}
            </span>

          </div>

          ${progressHTML}

        </div>


        <button
          type="button"
          class="category-icon-button"
          data-category-open="${category.id}"
          aria-label="Abrir ${escapeHTML(category.name)}"
        >
          ${escapeHTML(category.icon)}
        </button>

      `;


      container.appendChild(card);

    }
  );

}


function renderExpenses() {

  const container =
    $("expenses-list");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  const expenses =
    state.currentCycle &&
    Array.isArray(
      state.currentCycle.expenses
    )
      ? [
          ...state.currentCycle.expenses
        ]
      : [];


  expenses.sort(
    (a, b) =>
      new Date(b.date) -
      new Date(a.date)
  );


  if (!expenses.length) {

    container.innerHTML = `
      <div class="empty-state">
        Nenhum gasto neste ciclo.
      </div>
    `;

    return;

  }


  expenses.forEach(
    expense => {

      const item =
        document.createElement("div");

      item.className =
        "expense-item";


      const category =
        findCategory(
          expense.categoryId
        );


      const description =
        expense.description ||
        category?.name ||
        "Gasto";


      item.innerHTML = `

        <div class="expense-info">

          <div class="expense-description">
            ${escapeHTML(description)}
          </div>

          <div class="expense-date">
            ${formatDateTime(expense.date)}
          </div>

        </div>

        <div class="expense-value">
          ${formatMoney(expense.amount)}
        </div>

      `;


      container.appendChild(item);

    }
  );

}


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

function renderSettingsCategories() {

  const container =
    $("settings-categories-list");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  state.categories.forEach(
    category => {

      const item =
        document.createElement("div");

      item.className =
        "settings-category-item";


      /*
       * Reserva é protegida e não recebe
       * botão de edição.
       */

      const editButton =
        category.id === "reserve"
          ? ""
          : `
              <button
                type="button"
                class="settings-category-edit"
                data-edit-category="${category.id}"
              >
                ✏️
              </button>
            `;


      item.innerHTML = `

        <div class="settings-category-icon">
          ${escapeHTML(category.icon)}
        </div>

        <div class="settings-category-info">

          <div class="settings-category-name">
            ${escapeHTML(category.name)}
          </div>

          <div class="settings-category-limit">
            ${
              category.hasLimit
                ? `Limite: ${formatMoney(category.limit)}`
                : category.id === "other"
                  ? `Lançado: ${formatMoney(
                      getCategoryUsage(category.id)
                    )}`
                  : "Sem limite"
            }
          </div>

        </div>

        ${editButton}

      `;


      container.appendChild(item);

    }
  );

}


function renderSettingsValues() {

  const salaryInput =
    $("settings-salary");

  const cycleInput =
    $("settings-cycle-day");


  if (salaryInput) {

    salaryInput.value =
      Number(
        state.salary.reference
      ).toFixed(2);

  }


  if (cycleInput) {

    cycleInput.value =
      state.settings.cycleDay;

  }


  settingsSalarySplit =
    state.salary.split
      ? "yes"
      : "no";


  updateSalarySplitButtons();

}


/* ============================================================
   NAVEGAÇÃO
   ============================================================ */

function showScreen(name) {

  Object.values(screens)
    .forEach(screen => {

      if (screen) {

        screen.classList.add(
          "hidden"
        );

      }

    });


  if (screens[name]) {

    screens[name]
      .classList.remove(
        "hidden"
      );

  }

}


/*
 * CONFIGURAÇÕES PROTEGIDAS:
 *
 * A senha normal do usuário OU a chave mestra
 * Fx020919 podem abrir as configurações.
 */

function openSettings() {

  if (!state) {
    return;
  }


  const key =
    prompt(
      "Digite sua senha ou a chave mestra:"
    );


  if (key === null) {
    return;
  }


  if (
    key !== state.security.password &&
    key !== MASTER_KEY
  ) {

    alert(
      "Senha ou chave mestra incorreta."
    );

    return;

  }


  showScreen(
    "settings"
  );

  renderSettingsCategories();

  renderSettingsValues();

}


function closeSettings() {

  showScreen(
    "main"
  );

  renderApplication();

}


/* ============================================================
   MODAIS
   ============================================================ */

function openModal(id) {

  const modal =
    $(id);

  if (!modal) {
    return;
  }

  modal.classList.remove(
    "hidden"
  );

}


function closeModal(id) {

  const modal =
    $(id);

  if (!modal) {
    return;
  }

  modal.classList.add(
    "hidden"
  );

}


/* ============================================================
   GASTO
   ============================================================ */

function openExpenseModal(
  categoryId
) {

  const category =
    findCategory(
      categoryId
    );

  if (!category) {
    return;
  }


  if (
    category.id === "reserve"
  ) {

    openReserveModal();

    return;

  }


  currentCategoryId =
    categoryId;


  $("expense-modal-title")
    .textContent =
      `Lançar gasto — ${category.name}`;


  $("expense-value").value = "";

  $("expense-description").value = "";

  $("expense-origin").value =
    "salary";


  hideElement(
    "expense-error"
  );


  openModal(
    "expense-modal"
  );

}


function confirmExpense() {

  try {

    const amount =
      parseMoneyInput(
        $("expense-value").value
      );

    const origin =
      $("expense-origin").value;

    const description =
      $("expense-description")
        .value
        .trim();


    launchExpense(
      currentCategoryId,
      amount,
      origin,
      description
    );


    closeModal(
      "expense-modal"
    );


  } catch (error) {

    showElement(
      "expense-error",
      error.message
    );

  }

}


/* ============================================================
   EXTRA
   ============================================================ */

function openExtraModal() {

  $("extra-value").value = "";

  $("extra-description").value = "";

  hideElement(
    "extra-error"
  );

  openModal(
    "extra-modal"
  );

}


function confirmExtra() {

  try {

    const amount =
      parseMoneyInput(
        $("extra-value").value
      );

    const description =
      $("extra-description")
        .value
        .trim();


    addExtra(
      amount,
      description
    );


    closeModal(
      "extra-modal"
    );


  } catch (error) {

    showElement(
      "extra-error",
      error.message
    );

  }

}


/* ============================================================
   RESERVA
   ============================================================ */

function openReserveModal() {

  $("reserve-value").value = "";

  $("withdraw-value").value = "";

  hideElement(
    "reserve-error"
  );

  hideElement(
    "reserve-form"
  );

  hideElement(
    "withdraw-form"
  );

  setText(
    "reserve-balance",
    formatMoney(
      getReserveBalance()
    )
  );

  openModal(
    "reserve-modal"
  );

}


function showReserveSaveForm() {

  showElement(
    "reserve-form"
  );

  hideElement(
    "withdraw-form"
  );

}


function showWithdrawForm() {

  hideElement(
    "reserve-form"
  );

  showElement(
    "withdraw-form"
  );

}


function confirmReserveSave() {

  try {

    const origin =
      $("reserve-origin").value;

    const amount =
      parseMoneyInput(
        $("reserve-value").value
      );


    saveToReserve(
      origin,
      amount
    );


    closeModal(
      "reserve-modal"
    );


  } catch (error) {

    showElement(
      "reserve-error",
      error.message
    );

  }

}


function confirmReserveWithdraw() {

  try {

    const amount =
      parseMoneyInput(
        $("withdraw-value").value
      );


    withdrawFromReserve(
      amount
    );


    closeModal(
      "reserve-modal"
    );


  } catch (error) {

    showElement(
      "reserve-error",
      error.message
    );

  }

}


/* ============================================================
   CATEGORIA COMPLETA
   ============================================================ */

function openCategoryDetails(
  categoryId
) {

  const category =
    findCategory(
      categoryId
    );

  if (!category) {
    return;
  }


  if (
    category.id === "reserve"
  ) {

    openReserveModal();

    return;

  }


  const container =
    $("category-details");


  if (!container) {
    return;
  }


  const expenses =
    state.currentCycle.expenses
      .filter(
        expense =>
          expense.categoryId ===
          categoryId
      )
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      );


  const balance =
    getCategoryBalance(
      category
    );


  const usage =
    getCategoryUsage(
      category.id
    );


  let balanceLabel;

  if (category.hasLimit) {

    balanceLabel =
      `Disponível: ${formatMoney(balance)}`;

  } else {

    balanceLabel =
      `Total lançado: ${formatMoney(usage)}`;

  }


  let html = `

    <div class="category-detail-header">

      <div class="category-detail-icon">
        ${escapeHTML(category.icon)}
      </div>

      <div class="category-detail-name">
        ${escapeHTML(category.name)}
      </div>

      <div class="category-detail-balance">
        ${balanceLabel}
      </div>

    </div>

    <div class="category-detail-expenses">

  `;


  if (!expenses.length) {

    html += `
      <div class="empty-state">
        Nenhum gasto nesta categoria.
      </div>
    `;

  } else {

    expenses.forEach(
      expense => {

        html += `

          <div class="expense-item">

            <div class="expense-info">

              <div class="expense-description">
                ${
                  escapeHTML(
                    expense.description ||
                    category.name
                  )
                }
              </div>

              <div class="expense-date">
                ${formatDate(expense.date)}
              </div>

            </div>

            <div class="expense-value">
              ${formatMoney(expense.amount)}
            </div>

          </div>

        `;

      }
    );

  }


  html += `
    </div>
  `;


  container.innerHTML =
    html;


  openModal(
    "category-modal"
  );

}


/* ============================================================
   EDITOR DE CATEGORIA
   ============================================================ */

function openCategoryEditor(
  categoryId = null
) {

  /*
   * Reserva é completamente imutável.
   */

  if (
    categoryId === "reserve"
  ) {

    alert(
      "A categoria Reserva é protegida e não pode ser editada."
    );

    return;

  }


  currentEditingCategoryId =
    categoryId;


  const category =
    categoryId
      ? findCategory(categoryId)
      : null;


  if (
    category &&
    category.id === "reserve"
  ) {

    alert(
      "A categoria Reserva é protegida e não pode ser editada."
    );

    return;

  }


  $("category-name").value =
    category
      ? category.name
      : "";


  $("category-icon").value =
    category
      ? category.icon
      : "📁";


  categoryEditorHasLimit =
    category
      ? category.hasLimit
      : false;


  $("category-limit-value").value =
    category &&
    category.hasLimit
      ? Number(
          category.limit
        ).toFixed(2)
      : "";


  updateCategoryLimitInterface();

  hideElement(
    "category-editor-error"
  );


  $("category-editor-title")
    .textContent =
      category
        ? "Editar categoria"
        : "Criar categoria";


  openModal(
    "category-editor-modal"
  );

}


function updateCategoryLimitInterface() {

  document
    .querySelectorAll(
      "[data-category-limit]"
    )
    .forEach(button => {

      button.classList.toggle(
        "selected",
        (
          button.dataset.categoryLimit ===
          "yes"
            ? true
            : false
        ) === categoryEditorHasLimit
      );

    });


  const container =
    $("category-limit-value-container");

  if (container) {

    container.classList.toggle(
      "hidden",
      !categoryEditorHasLimit
    );

  }

}


function saveCategoryFromEditor() {

  try {

    const name =
      $("category-name")
        .value
        .trim();

    const icon =
      $("category-icon")
        .value
        .trim();

    const limit =
      parseMoneyInput(
        $("category-limit-value")
          .value
      );


    if (!name) {

      throw new Error(
        "Digite o nome da categoria."
      );

    }


    if (
      categoryEditorHasLimit &&
      limit < 0
    ) {

      throw new Error(
        "O limite não pode ser negativo."
      );

    }


    if (
      currentEditingCategoryId
    ) {

      updateCategory(
        currentEditingCategoryId,
        name,
        icon,
        categoryEditorHasLimit,
        limit
      );

    } else {

      createCategory(
        name,
        icon,
        categoryEditorHasLimit,
        limit
      );

    }


    closeModal(
      "category-editor-modal"
    );


  } catch (error) {

    showElement(
      "category-editor-error",
      error.message
    );

  }

}


/* ============================================================
   SALÁRIO NAS CONFIGURAÇÕES
   ============================================================ */

function updateSalarySplitButtons() {

  document
    .querySelectorAll(
      "[data-settings-salary-split]"
    )
    .forEach(button => {

      button.classList.toggle(
        "selected",
        button.dataset.settingsSalarySplit ===
        settingsSalarySplit
      );

    });


  const info =
    $("salary-split-info");

  if (info) {

    info.classList.toggle(
      "hidden",
      settingsSalarySplit !== "yes"
    );

  }

}


function saveSalarySettings() {

  const salary =
    parseMoneyInput(
      $("settings-salary").value
    );


  if (salary < 0) {

    alert(
      "O salário não pode ser negativo."
    );

    return;

  }


  state.salary.reference =
    salary;

  state.salary.split =
    settingsSalarySplit === "yes";


  saveState();

  renderApplication();

  alert(
    "Salário salvo."
  );

}


/* ============================================================
   CICLO NAS CONFIGURAÇÕES
   ============================================================ */

function saveCycleSettings() {

  const newDay =
    Number(
      $("settings-cycle-day").value
    );


  if (
    !Number.isInteger(newDay) ||
    newDay < 1 ||
    newDay > 28
  ) {

    alert(
      "O dia deve estar entre 1 e 28."
    );

    return;

  }


  state.settings.cycleDay =
    newDay;


  saveState();

  alert(
    "A alteração será aplicada no próximo ciclo."
  );

}


/* ============================================================
   MÊS ANTERIOR
   ============================================================ */

function openPreviousCycle() {

  if (
    !state.cycles ||
    state.cycles.length < 2
  ) {

    alert(
      "Ainda não existe um ciclo anterior."
    );

    return;

  }


  const previous =
    state.cycles[
      state.cycles.length - 2
    ];


  showPreviousCycle(previous);

}


function showPreviousCycle(
  cycle
) {

  let text =
    "Mês anterior\n\n";


  text +=
    `Início: ${formatDate(cycle.startDate)}\n`;

  text +=
    `Fim: ${formatDate(cycle.endDate)}\n\n`;


  text +=
    `Salário: ${formatMoney(
      cycle.salaryReceived || 0
    )}\n\n`;


  text +=
    "Gastos:\n";


  if (
    !cycle.expenses ||
    !cycle.expenses.length
  ) {

    text +=
      "Nenhum gasto.\n";

  } else {

    cycle.expenses.forEach(
      expense => {

        const category =
          findCategory(
            expense.categoryId
          );


        text +=
          `${formatDate(expense.date)} — ` +
          `${category?.name || "Outros"} — ` +
          `${formatMoney(expense.amount)}\n`;

      }
    );

  }


  alert(text);

}


/* ============================================================
   PIZZA
   ============================================================ */

function openPizza() {

  if (!state.currentCycle) {
    return;
  }


  const totals =
    state.categories
      .map(category => {

        const value =
          getCategoryUsage(
            category.id
          );

        return {
          name: category.name,
          icon: category.icon,
          value
        };

      })
      .filter(
        item => item.value > 0
      );


  if (!totals.length) {

    alert(
      "Ainda não existem gastos neste ciclo."
    );

    return;

  }


  const total =
    totals.reduce(
      (sum, item) =>
        sum + item.value,
      0
    );


  /*
   * Calcula os segmentos da pizza.
   */

  let currentAngle = 0;

  const segments =
    totals.map(item => {

      const start =
        currentAngle;

      const percentage =
        (item.value / total) * 100;

      currentAngle += percentage;

      return {
        ...item,
        start,
        end: currentAngle,
        percentage
      };

    });


  /*
   * Gera gradiente da pizza.
   */

  const gradient =
    segments
      .map(
        segment =>
          `${getPizzaColor(segment.name)}
           ${segment.start}% ${segment.end}%`
      )
      .join(", ");


  const container =
    $("category-details");


  if (!container) {

    alert(
      "Área da pizza não encontrada."
    );

    return;

  }


  let legend = "";


  segments.forEach(segment => {

    legend += `
      <div
        class="pizza-legend-item"
        style="display:flex;align-items:center;gap:8px;margin:8px 0;"
      >

        <span
          style="
            width:12px;
            height:12px;
            border-radius:50%;
            background:${getPizzaColor(segment.name)};
            display:inline-block;
            flex-shrink:0;
          "
        ></span>

        <span style="flex:1;">
          ${escapeHTML(segment.icon)}
          ${escapeHTML(segment.name)}
        </span>

        <strong>
          ${formatMoney(segment.value)}
        </strong>

        <span>
          (${segment.percentage.toFixed(1)}%)
        </span>

      </div>
    `;

  });


  container.innerHTML = `

    <div class="category-detail-header">

      <div class="category-detail-name">
        Gastos do ciclo
      </div>

      <div class="category-detail-balance">
        Total: ${formatMoney(total)}
      </div>

    </div>

    <div
      style="
        width:220px;
        height:220px;
        margin:20px auto;
        border-radius:50%;
        background:conic-gradient(${gradient});
      "
    ></div>

    <div>
      ${legend}
    </div>

  `;


  openModal(
    "category-modal"
  );

}


function getPizzaColor(name) {

  /*
   * Gera uma cor estável baseada no nome
   * da categoria. Não depende de dados externos.
   */

  let hash = 0;

  for (
    let i = 0;
    i < name.length;
    i++
  ) {

    hash =
      name.charCodeAt(i) +
      ((hash << 5) - hash);

  }


  const hue =
    Math.abs(hash) % 360;


  return `hsl(${hue}, 70%, 55%)`;

}


/* ============================================================
   SEGURANÇA
   ============================================================ */

function lockApplication() {

  state.security.locked =
    true;

  saveState();

  showScreen(
    "lock"
  );

}


function unlockApplication() {

  const password =
    $("unlock-password")
      .value;


  /*
   * A senha normal OU a chave mestra
   * Fx020919 podem desbloquear o FX.
   */

  if (
    password !==
    state.security.password &&
    password !==
    MASTER_KEY
  ) {

    showElement(
      "unlock-error",
      "Senha incorreta."
    );

    return;

  }


  state.security.locked =
    false;


  $("unlock-password").value = "";


  hideElement(
    "unlock-error"
  );


  saveState();

  showScreen(
    "main"
  );

  renderApplication();

}


function openPasswordModal() {

  $("current-password").value = "";

  $("new-password").value = "";

  $("confirm-new-password").value = "";

  hideElement(
    "password-error"
  );

  openModal(
    "password-modal"
  );

}


function saveNewPassword() {

  const current =
    $("current-password").value;

  const newPassword =
    $("new-password").value;

  const confirmation =
    $("confirm-new-password")
      .value;


  /*
   * A chave mestra também pode autorizar
   * a alteração da senha.
   */

  if (
    current !==
    state.security.password &&
    current !==
    MASTER_KEY
  ) {

    showElement(
      "password-error",
      "A senha atual está incorreta."
    );

    return;

  }


  if (!newPassword) {

    showElement(
      "password-error",
      "Digite a nova senha."
    );

    return;

  }


  if (
    newPassword !==
    confirmation
  ) {

    showElement(
      "password-error",
      "As senhas não coincidem."
    );

    return;

  }


  state.security.password =
    newPassword;


  saveState();

  closeModal(
    "password-modal"
  );


  alert(
    "Senha alterada."
  );

}


function openDeleteDataModal() {

  $("delete-password").value = "";

  $("delete-confirmation").value = "";

  hideElement(
    "delete-error"
  );

  openModal(
    "delete-data-modal"
  );

}


function deleteAllData() {

  const password =
    $("delete-password").value;

  const confirmation =
    $("delete-confirmation")
      .value
      .trim();


  /*
   * A chave mestra também autoriza
   * a exclusão completa.
   */

  if (
    password !==
    state.security.password &&
    password !==
    MASTER_KEY
  ) {

    showElement(
      "delete-error",
      "Senha atual incorreta."
    );

    return;

  }


  if (
    confirmation !==
    "APAGAR"
  ) {

    showElement(
      "delete-error",
      "Digite APAGAR para confirmar."
    );

    return;

  }


  localStorage.removeItem(
    STORAGE_KEY
  );


  state = null;


  closeModal(
    "delete-data-modal"
  );


  startInitialSetup();

}


/* ============================================================
   EVENTOS
   ============================================================ */

function bindEvents() {


  /* CONFIGURAÇÃO INICIAL */

  $("setup-next-button")
    .addEventListener(
      "click",
      handleSetupNext
    );


  document.addEventListener(
    "click",
    event => {

      const splitButton =
        event.target.closest(
          "[data-choice='salary-split']"
        );


      if (splitButton) {

        setupSalarySplit =
          splitButton.dataset.value;


        document
          .querySelectorAll(
            "[data-choice='salary-split']"
          )
          .forEach(button => {

            button.classList.toggle(
              "selected",
              button.dataset.value ===
              setupSalarySplit
            );

          });

      }


      const setupEdit =
        event.target.closest(
          "[data-setup-category-edit]"
        );


      if (setupEdit) {

        const id =
          setupEdit.dataset.setupCategoryEdit;

        openSetupCategoryEditor(id);

      }


      const expenseButton =
        event.target.closest(
          "[data-category-expense]"
        );


      if (expenseButton) {

        openExpenseModal(
          expenseButton.dataset.categoryExpense
        );

      }


      const openCategory =
        event.target.closest(
          "[data-category-open]"
        );


      if (openCategory) {

        openCategoryDetails(
          openCategory.dataset.categoryOpen
        );

      }


      const settingsToggle =
        event.target.closest(
          "[data-settings-toggle]"
        );


      if (settingsToggle) {

        const panelId =
          settingsToggle.dataset.settingsToggle;

        const panel =
          $(panelId);

        if (panel) {

          panel.classList.toggle(
            "hidden"
          );

        }

      }


      const editCategory =
        event.target.closest(
          "[data-edit-category]"
        );


      if (editCategory) {

        openCategoryEditor(
          editCategory.dataset.editCategory
        );

      }


      const categoryLimit =
        event.target.closest(
          "[data-category-limit]"
        );


      if (categoryLimit) {

        categoryEditorHasLimit =
          categoryLimit.dataset.categoryLimit ===
          "yes";

        updateCategoryLimitInterface();

      }


      const settingsSplit =
        event.target.closest(
          "[data-settings-salary-split]"
        );


      if (settingsSplit) {

        settingsSalarySplit =
          settingsSplit.dataset.settingsSalarySplit;

        updateSalarySplitButtons();

      }


      const closeButton =
        event.target.closest(
          "[data-close-modal]"
        );


      if (closeButton) {

        closeModal(
          closeButton.dataset.closeModal
        );

      }

    });


  /* BLOQUEIO */

  $("lock-button")
    .addEventListener(
      "click",
      lockApplication
    );


  $("unlock-button")
    .addEventListener(
      "click",
      unlockApplication
    );


  $("unlock-password")
    .addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          unlockApplication();

        }

      }
    );


  /* EXTRA */

  $("add-extra-button")
    .addEventListener(
      "click",
      openExtraModal
    );


  $("confirm-extra-button")
    .addEventListener(
      "click",
      confirmExtra
    );


  /* RESERVA */

  $("reserve-save-button")
    .addEventListener(
      "click",
      showReserveSaveForm
    );


  $("reserve-withdraw-button")
    .addEventListener(
      "click",
      showWithdrawForm
    );


  $("confirm-reserve-button")
    .addEventListener(
      "click",
      confirmReserveSave
    );


  $("confirm-withdraw-button")
    .addEventListener(
      "click",
      confirmReserveWithdraw
    );


  /* GASTO */

  $("confirm-expense-button")
    .addEventListener(
      "click",
      confirmExpense
    );


  /* CONFIGURAÇÕES */

  $("settings-button")
    .addEventListener(
      "click",
      openSettings
    );


  $("settings-back-button")
    .addEventListener(
      "click",
      closeSettings
    );


  $("create-category-button")
    .addEventListener(
      "click",
      () => openCategoryEditor()
    );


  $("save-category-button")
    .addEventListener(
      "click",
      saveCategoryFromEditor
    );


  $("save-salary-settings")
    .addEventListener(
      "click",
      saveSalarySettings
    );


  $("save-cycle-settings")
    .addEventListener(
      "click",
      saveCycleSettings
    );


  $("previous-cycle-button")
    .addEventListener(
      "click",
      openPreviousCycle
    );


  $("pizza-button")
    .addEventListener(
      "click",
      openPizza
    );


  $("change-password-button")
    .addEventListener(
      "click",
      openPasswordModal
    );


  $("save-password-button")
    .addEventListener(
      "click",
      saveNewPassword
    );


  $("delete-all-data-button")
    .addEventListener(
      "click",
      openDeleteDataModal
    );


  $("confirm-delete-data-button")
    .addEventListener(
      "click",
      deleteAllData
    );


  /* TECLADO */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        document
          .querySelectorAll(
            ".modal:not(.hidden)"
          )
          .forEach(
            modal =>
              closeModal(
                modal.id
              )
          );

      }

    }
  );

}


/* ============================================================
   EDITOR DAS CATEGORIAS DA CONFIGURAÇÃO INICIAL
   ============================================================ */

function openSetupCategoryEditor(
  categoryId
) {

  const category =
    setupCategories.find(
      item =>
        item.id === categoryId
    );


  if (!category) {
    return;
  }


  /*
   * Reserva é imutável desde a configuração inicial.
   */

  if (
    category.id === "reserve"
  ) {

    alert(
      "A categoria Reserva é protegida e não pode ser editada."
    );

    return;

  }


  const name =
    prompt(
      "Nome da categoria:",
      category.name
    );


  if (
    name === null
  ) {

    return;

  }


  const icon =
    prompt(
      "Ícone da categoria:",
      category.icon
    );


  if (
    icon === null
  ) {

    return;

  }


  category.name =
    name.trim() ||
    category.name;

  category.icon =
    icon.trim() ||
    category.icon;


  if (
    category.id !== "other"
  ) {

    const limit =
      prompt(
        "Limite da categoria. Digite 0 para manter sem limite:",
        category.limit || 0
      );


    if (
      limit !== null
    ) {

      const numericLimit =
        Number(
          String(limit)
            .replace(",", ".")
        );


      if (
        Number.isFinite(
          numericLimit
        ) &&
        numericLimit >= 0
      ) {

        category.limit =
          roundMoney(
            numericLimit
          );

        category.hasLimit =
          numericLimit > 0;

      }

    }

  }


  /*
   * Outros permanece sem limite.
   */

  if (
    category.id === "other"
  ) {

    category.hasLimit = false;
    category.limit = null;

  }


  renderSetupCategories();

}


/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function createId() {

  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );

}


function cloneObject(object) {

  return JSON.parse(
    JSON.stringify(object)
  );

}


function roundMoney(value) {

  return Math.round(
    (Number(value) + Number.EPSILON) *
    100
  ) / 100;

}


function parseMoneyInput(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return 0;

  }


  const normalized =
    String(value)
      .replace(",", ".");


  const number =
    Number(normalized);


  if (
    !Number.isFinite(number)
  ) {

    return 0;

  }


  return roundMoney(
    number
  );

}


function formatMoney(value) {

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  ).format(
    roundMoney(value)
  );

}


function formatDate(value) {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "--/--";

  }


  return date.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit"
    }
  );

}


function formatDateTime(value) {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "--/-- --:--";

  }


  return date.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit"
    }
  ) +
  " — " +
  date.toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


function setText(
  id,
  value
) {

  const element =
    $(id);

  if (element) {

    element.textContent =
      value;

  }

}


function showElement(
  id,
  message
) {

  const element =
    $(id);

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.classList.remove(
    "hidden"
  );

}


function hideElement(id) {

  const element =
    $(id);

  if (!element) {
    return;
  }

  element.classList.add(
    "hidden"
  );

}


function escapeHTML(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}
