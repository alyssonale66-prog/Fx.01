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

/*
 * A chave mestra continua funcionando no aplicativo.
 * Como o FX é 100% client-side, nenhuma chave embutida
 * no JavaScript pode ser considerada segredo absoluto.
 */
const MASTER_KEY = [
  "F",
  "x",
  "0",
  "2",
  "0",
  "9",
  "1",
  "9"
].join("");


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
    protected: true,
    immutable: true
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

let categoryEditorHasLimit = false;


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

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initializeApplication();
  }
);


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

  const stored =
    localStorage.getItem(
      STORAGE_KEY
    );


  if (!stored) {

    startInitialSetup();

    return;

  }


  try {

    state =
      JSON.parse(
        stored
      );


    normalizeState();


    if (!state.setupCompleted) {

      startInitialSetup();

      return;

    }


    if (
      state.security &&
      state.security.locked
    ) {

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

    localStorage.removeItem(
      STORAGE_KEY
    );

    startInitialSetup();

  }

}


/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

function normalizeState() {

  if (
    !state ||
    typeof state !== "object"
  ) {

    state =
      createEmptyState();

    return;

  }


  if (
    !Array.isArray(
      state.categories
    )
  ) {

    state.categories = [];

  }


  if (
    !Array.isArray(
      state.cycles
    )
  ) {

    state.cycles = [];

  }


  if (
    !state.currentCycle
  ) {

    state.currentCycle = null;

  }


  if (
    !state.reserve ||
    typeof state.reserve !== "object"
  ) {

    state.reserve = {
      balance: 0
    };

  }


  if (
    !Number.isFinite(
      Number(
        state.reserve.balance
      )
    )
  ) {

    state.reserve.balance = 0;

  }


  if (
    !state.salary ||
    typeof state.salary !== "object"
  ) {

    state.salary = {
      reference: 0,
      split: false
    };

  }


  if (
    !state.extra ||
    typeof state.extra !== "object"
  ) {

    state.extra = {
      balance: 0
    };

  }


  if (
    !state.security ||
    typeof state.security !== "object"
  ) {

    state.security = {
      password: "",
      locked: false
    };

  }


  if (
    !state.settings ||
    typeof state.settings !== "object"
  ) {

    state.settings = {
      cycleDay: 5
    };

  }


  if (
    !Number.isInteger(
      Number(
        state.settings.cycleDay
      )
    )
  ) {

    state.settings.cycleDay = 5;

  }


  /*
   * Compatibilidade com dados antigos.
   */
  state.categories.forEach(
    category => {

      if (
        category.id === "reserve"
      ) {

        category.name = "Reserva";
        category.icon = "💰";
        category.hasLimit = false;
        category.limit = null;
        category.protected = true;
        category.immutable = true;

      }


      if (
        category.id === "other"
      ) {

        category.hasLimit = false;
        category.limit = null;
        category.protected = true;

      }

    }
  );


  normalizeCycle(
    state.currentCycle
  );


  state.cycles.forEach(
    cycle => {

      normalizeCycle(
        cycle
      );

    }
  );

}


function normalizeCycle(cycle) {

  if (!cycle) {
    return;
  }


  if (
    !Array.isArray(
      cycle.expenses
    )
  ) {

    cycle.expenses = [];

  }


  /*
   * Transferências para Reserva ficam separadas
   * dos gastos reais.
   */
  if (
    !Array.isArray(
      cycle.transfers
    )
  ) {

    cycle.transfers = [];

  }


  if (
    !cycle.categoryUsage ||
    typeof cycle.categoryUsage !== "object"
  ) {

    cycle.categoryUsage = {};

  }


  if (
    !cycle.salaryReceived
  ) {

    cycle.salaryReceived = 0;

  }


  if (
    !cycle.extraAtStart
  ) {

    cycle.extraAtStart = 0;

  }


  if (
    !cycle.salaryAdded
  ) {

    cycle.salaryAdded = false;

  }


  /*
   * Recalcula categoryUsage a partir dos gastos
   * reais para corrigir estados antigos.
   */
  if (
    state &&
    Array.isArray(
      state.categories
    )
  ) {

    state.categories.forEach(
      category => {

        let total = 0;


        cycle.expenses.forEach(
          expense => {

            if (
              expense.categoryId ===
              category.id
            ) {

              total +=
                Number(
                  expense.amount
                ) || 0;

            }

          }
        );


        cycle.categoryUsage[
          category.id
        ] =
          roundMoney(
            total
          );

      }
    );

  }

}


/* ============================================================
   ESTADO VAZIO
   ============================================================ */

function createEmptyState() {

  return {

    version:
      FX_VERSION,

    setupCompleted:
      false,

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

  state =
    createEmptyState();

  setupCategories =
    cloneDefaultCategories();

  currentSetupStep = 1;

  setupSalarySplit = null;

  showScreen(
    "setup"
  );

  renderSetupStep();

}


function cloneDefaultCategories() {

  return DEFAULT_CATEGORIES.map(
    category => ({
      ...category
    })
  );

}


function renderSetupStep() {

  const steps =
    document.querySelectorAll(
      ".setup-step"
    );


  steps.forEach(
    step => {

      const stepNumber =
        Number(
          step.dataset.step
        );


      step.classList.toggle(
        "hidden",
        stepNumber !==
        currentSetupStep
      );

    }
  );


  if (
    currentSetupStep === 6
  ) {

    renderSetupCategories();

  }


  const button =
    $("setup-next-button");


  if (!button) {
    return;
  }


  button.textContent =
    currentSetupStep === 6
      ? "Concluir configuração"
      : "Continuar";

}


function renderSetupCategories() {

  const container =
    $("setup-categories");


  if (!container) {
    return;
  }


  container.innerHTML = "";


  setupCategories.forEach(
    category => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "settings-category-item";


      const editButton =
        category.id === "reserve"
          ? ""
          : `
            <button
              type="button"
              class="settings-category-edit"
              data-setup-category-edit="${escapeHTML(category.id)}"
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
                : "Sem limite"
            }
          </div>

        </div>

        ${editButton}

      `;


      container.appendChild(
        item
      );

    }
  );

}


function handleSetupNext() {

  if (
    currentSetupStep === 1
  ) {

    const input =
      $("setup-username");


    const username =
      input
        ? input.value.trim()
        : "";


    if (!username) {

      showSetupError(
        "Digite um nome de usuário."
      );


      if (input) {
        input.focus();
      }


      return;

    }


    state.user.name =
      username;

  }


  if (
    currentSetupStep === 2
  ) {

    const input =
      $("setup-password");


    const password =
      input
        ? input.value
        : "";


    if (!password) {

      showSetupError(
        "Crie uma senha."
      );


      if (input) {
        input.focus();
      }


      return;

    }


    state.security.password =
      password;

  }


  if (
    currentSetupStep === 3
  ) {

    const input =
      $("setup-salary");


    const raw =
      input
        ? input.value
        : "";


    const salary =
      parseMoneyInput(
        raw
      );


    if (
      raw.trim() !== "" &&
      salary === 0 &&
      !isZeroMoneyInput(raw)
    ) {

      showSetupError(
        "Digite um salário válido."
      );


      if (input) {
        input.focus();
      }


      return;

    }


    if (
      salary < 0
    ) {

      showSetupError(
        "O salário não pode ser negativo."
      );


      if (input) {
        input.focus();
      }


      return;

    }


    state.salary.reference =
      salary;

  }


  if (
    currentSetupStep === 4
  ) {

    if (
      setupSalarySplit === null
    ) {

      showSetupError(
        "Escolha se deseja dividir o salário."
      );


      return;

    }


    state.salary.split =
      setupSalarySplit === "yes";

  }


  if (
    currentSetupStep === 5
  ) {

    const input =
      $("setup-cycle-day");


    const day =
      Number(
        input
          ? input.value
          : NaN
      );


    if (
      !Number.isInteger(day) ||
      day < 1 ||
      day > 28
    ) {

      showSetupError(
        "O dia do ciclo deve estar entre 1 e 28."
      );


      if (input) {
        input.focus();
      }


      return;

    }


    state.settings.cycleDay =
      day;

  }


  if (
    currentSetupStep < 6
  ) {

    currentSetupStep++;

    renderSetupStep();

    return;

  }


  completeInitialSetup();

}


function showSetupError(message) {

  alert(
    message
  );

}


/* ============================================================
   CONCLUSÃO DA CONFIGURAÇÃO
   ============================================================ */

function completeInitialSetup() {

  state.categories =
    setupCategories.map(
      category => ({

        ...category,

        cycleUsage: 0

      })
    );


  state.setupCompleted =
    true;

  state.security.locked =
    false;


  createInitialCycle();


  addSalaryToCurrentCycle();


  saveState();


  showScreen(
    "main"
  );


  renderApplication();

}


function createInitialCycle() {

  const now =
    new Date();


  const cycleStart =
    calculateCurrentCycleStart(
      now,
      state.settings.cycleDay
    );


  state.currentCycle = {

    id:
      createId(),

    startDate:
      cycleStart.toISOString(),

    endDate:
      calculateNextCycleStart(
        cycleStart,
        state.settings.cycleDay
      ).toISOString(),

    salaryAdded:
      false,

    salaryReceived:
      roundMoney(
        state.salary.reference
      ),

    extraAtStart:
      roundMoney(
        state.extra.balance
      ),

    expenses: [],

    transfers: [],

    categoryUsage: {}

  };


  state.categories.forEach(
    category => {

      state.currentCycle
        .categoryUsage[
          category.id
        ] = 0;

    }
  );


  state.cycles.push(
    cloneObject(
      state.currentCycle
    )
  );

}


/* ============================================================
   CICLOS
   ============================================================ */

function calculateCurrentCycleStart(
  date,
  cycleDay
) {

  const result =
    new Date(date);


  result.setHours(
    0,
    0,
    0,
    0
  );


  if (
    result.getDate() <
    cycleDay
  ) {

    result.setMonth(
      result.getMonth() - 1
    );

  }


  result.setDate(
    cycleDay
  );


  return result;

}


function calculateNextCycleStart(
  startDate,
  cycleDay
) {

  const result =
    new Date(
      startDate
    );


  result.setMonth(
    result.getMonth() + 1
  );


  result.setDate(
    cycleDay
  );


  return result;

}


function ensureCurrentCycle() {

  if (!state) {
    return;
  }


  if (
    !state.currentCycle
  ) {

    createInitialCycle();

    addSalaryToCurrentCycle();

    saveState();

    return;

  }


  const now =
    new Date();


  let safety =
    0;


  /*
   * Cria TODOS os ciclos intermediários.
   * Isso evita pular Janeiro -> Março, por exemplo.
   */
  while (
    now >=
    new Date(
      state.currentCycle.endDate
    ) &&
    safety < 120
  ) {

    startNewCycle();

    safety++;

  }

}


function startNewCycle() {

  const previousCycle =
    cloneObject(
      state.currentCycle
    );


  /*
   * Evita duplicar o mesmo ciclo no histórico.
   */
  const alreadyStored =
    state.cycles.some(
      cycle =>
        cycle.id ===
        previousCycle.id
    );


  if (!alreadyStored) {

    state.cycles.push(
      previousCycle
    );

  }


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

    id:
      createId(),

    startDate:
      newStart.toISOString(),

    endDate:
      newEnd.toISOString(),

    salaryAdded:
      false,

    salaryReceived:
      roundMoney(
        state.salary.reference
      ),

    extraAtStart:
      roundMoney(
        state.extra.balance
      ),

    expenses: [],

    transfers: [],

    categoryUsage: {}

  };


  state.categories.forEach(
    category => {

      state.currentCycle
        .categoryUsage[
          category.id
        ] = 0;

    }
  );


  addSalaryToCurrentCycle();


  saveState();

}


/* ============================================================
   SALÁRIO
   ============================================================ */

function addSalaryToCurrentCycle() {

  if (
    !state ||
    !state.currentCycle
  ) {

    return;

  }


  if (
    state.currentCycle.salaryAdded
  ) {

    return;

  }


  const amount =
    roundMoney(
      state.salary.reference
    );


  state.currentCycle.salaryReceived =
    amount;


  state.currentCycle.salaryAdded =
    true;


  state.currentCycle.salaryEntryDate =
    new Date().toISOString();

}


function getSalaryBalance() {

  if (
    !state ||
    !state.currentCycle
  ) {

    return 0;

  }


  let balance =
    Number(
      state.currentCycle.salaryReceived ||
      0
    );


  /*
   * Gastos normais do salário.
   */
  state.currentCycle.expenses.forEach(
    expense => {

      if (
        expense.origin ===
        "salary"
      ) {

        balance -=
          Number(
            expense.amount
          ) || 0;

      }

    }
  );


  /*
   * Transferências do salário para a Reserva.
   * Não são gastos e não entram na pizza,
   * mas naturalmente reduzem o dinheiro disponível.
   */
  state.currentCycle.transfers.forEach(
    transfer => {

      if (
        transfer.origin ===
        "salary"
      ) {

        balance -=
          Number(
            transfer.amount
          ) || 0;

      }

    }
  );


  return roundMoney(
    Math.max(
      0,
      balance
    )
  );

}


/* ============================================================
   EXTRA
   ============================================================ */

function addExtra(
  amount,
  description
) {

  amount =
    roundMoney(
      amount
    );


  if (
    amount <= 0
  ) {

    throw new Error(
      "O valor do Extra deve ser maior que zero."
    );

  }


  state.extra.balance =
    roundMoney(
      state.extra.balance +
      amount
    );


  saveState();

  renderApplication();

}


function getExtraBalance() {

  if (
    !state.currentCycle
  ) {

    return roundMoney(
      state.extra.balance
    );

  }


  let balance =
    Number(
      state.extra.balance
    ) || 0;


  state.currentCycle.expenses.forEach(
    expense => {

      if (
        expense.origin ===
        "extra"
      ) {

        balance -=
          Number(
            expense.amount
          ) || 0;

      }

    }
  );


  state.currentCycle.transfers.forEach(
    transfer => {

      if (
        transfer.origin ===
        "extra"
      ) {

        balance -=
          Number(
            transfer.amount
          ) || 0;

      }

    }
  );


  return roundMoney(
    Math.max(
      0,
      balance
    )
  );

}


/* ============================================================
   RESERVA
   ============================================================ */

function getReserveBalance() {

  return roundMoney(
    state &&
    state.reserve
      ? state.reserve.balance
      : 0
  );

}


function saveToReserve(
  origin,
  amount
) {

  amount =
    roundMoney(
      amount
    );


  if (
    amount <= 0
  ) {

    throw new Error(
      "O valor deve ser maior que zero."
    );

  }


  if (
    origin !== "salary" &&
    origin !== "extra"
  ) {

    throw new Error(
      "Escolha uma origem válida."
    );

  }


  const available =
    getOriginBalance(
      origin
    );


  if (
    amount > available
  ) {

    throw new Error(
      "Não existe dinheiro suficiente nessa origem."
    );

  }


  /*
   * IMPORTANTE:
   * Transferência para Reserva NÃO é gasto.
   *
   * Portanto não entra em expenses,
   * não entra na pizza e não aumenta
   * o total de nenhuma categoria.
   */
  if (
    !state.currentCycle.transfers
  ) {

    state.currentCycle.transfers =
      [];

  }


  state.currentCycle.transfers.push({

    id:
      createId(),

    origin,

    amount:
      roundMoney(
        amount
      ),

    type:
      origin === "salary"
        ? "salary-to-reserve"
        : "extra-to-reserve",

    description:
      "Transferência para Reserva",

    date:
      new Date().toISOString()

  });


  state.reserve.balance =
    roundMoney(
      state.reserve.balance +
      amount
    );


  saveState();

  renderApplication();

}


function withdrawFromReserve(
  amount
) {

  amount =
    roundMoney(
      amount
    );


  if (
    amount <= 0
  ) {

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


  /*
   * O dinheiro retirado volta para o Extra,
   * ficando disponível para utilização.
   */
  state.reserve.balance =
    roundMoney(
      state.reserve.balance -
      amount
    );


  state.extra.balance =
    roundMoney(
      state.extra.balance +
      amount
    );


  /*
   * A retirada aparece em Outros,
   * conforme a regra definida para o FX.
   */
  createExpenseRecord(
    "reserve",
    amount,
    "Retirada da reserva",
    "reserve-withdrawal"
  );


  incrementCategoryUsage(
    "other",
    amount
  );


  saveState();

  renderApplication();

}


/* ============================================================
   ORIGENS
   ============================================================ */

function getOriginBalance(
  origin
) {

  if (
    origin === "salary"
  ) {

    return getSalaryBalance();

  }


  if (
    origin === "extra"
  ) {

    return getExtraBalance();

  }


  if (
    origin === "reserve"
  ) {

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
    roundMoney(
      amount
    );


  if (
    amount <= 0
  ) {

    throw new Error(
      "O valor deve ser maior que zero."
    );

  }


  const category =
    findCategory(
      categoryId
    );


  if (!category) {

    throw new Error(
      "Categoria não encontrada."
    );

  }


  if (
    category.id ===
    "reserve"
  ) {

    throw new Error(
      "A Reserva possui uma operação própria."
    );

  }


  if (
    origin !== "salary" &&
    origin !== "extra"
  ) {

    throw new Error(
      "Escolha uma origem válida."
    );

  }


  const available =
    getOriginBalance(
      origin
    );


  if (
    amount > available
  ) {

    throw new Error(
      "O valor é maior que o saldo disponível da origem."
    );

  }


  /*
   * Categoria com limite:
   * limite 0 significa limite real de R$ 0,00.
   *
   * Para categoria sem limite, não existe
   * qualquer bloqueio por limite.
   */
  if (
    category.hasLimit
  ) {

    const limit =
      Number(
        category.limit
      ) || 0;


    const used =
      getCategoryUsage(
        category.id
      );


    const remaining =
      roundMoney(
        limit -
        used
      );


    if (
      amount >
      remaining
    ) {

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


  incrementCategoryUsage(
    category.id,
    amount
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

  if (
    !state.currentCycle
  ) {

    return;

  }


  const expense = {

    id:
      createId(),

    origin,

    amount:
      roundMoney(
        amount
      ),

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
    !Array.isArray(
      state.currentCycle.expenses
    )
  ) {

    state.currentCycle.expenses =
      [];

  }


  state.currentCycle.expenses.push(
    expense
  );

}


function incrementCategoryUsage(
  categoryId,
  amount
) {

  if (
    !state.currentCycle
  ) {

    return;

  }


  if (
    !state.currentCycle.categoryUsage
  ) {

    state.currentCycle.categoryUsage =
      {};

  }


  if (
    !Number.isFinite(
      Number(
        state.currentCycle
          .categoryUsage[
            categoryId
          ]
      )
    )
  ) {

    state.currentCycle
      .categoryUsage[
        categoryId
      ] = 0;

  }


  state.currentCycle
    .categoryUsage[
      categoryId
    ] =
      roundMoney(
        state.currentCycle
          .categoryUsage[
            categoryId
          ] +
        amount
      );

}


function getCategoryUsage(
  categoryId
) {

  if (
    !state ||
    !state.currentCycle ||
    !state.currentCycle.categoryUsage
  ) {

    return 0;

  }


  return roundMoney(
    state.currentCycle
      .categoryUsage[
        categoryId
      ] || 0
  );

}


function getCategoryBalance(
  category
) {

  if (!category) {
    return 0;
  }


  if (
    category.id ===
    "reserve"
  ) {

    return getReserveBalance();

  }


  if (
    category.id ===
    "other"
  ) {

    return getCategoryUsage(
      "other"
    );

  }


  if (
    !category.hasLimit
  ) {

    return null;

  }


  const usage =
    getCategoryUsage(
      category.id
    );


  const limit =
    Number(
      category.limit
    ) || 0;


  return roundMoney(
    Math.max(
      0,
      limit - usage
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

function findCategory(
  id
) {

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
    String(
      name || ""
    ).trim();


  if (!cleanName) {

    throw new Error(
      "Digite o nome da categoria."
    );

  }


  const finalHasLimit =
    Boolean(
      hasLimit
    );


  const finalLimit =
    finalHasLimit
      ? roundMoney(
          Number(
            limit
          ) || 0
        )
      : null;


  const category = {

    id:
      "custom-" +
      createId(),

    name:
      cleanName,

    icon:
      String(
        icon || ""
      ).trim() ||
      "📁",

    hasLimit:
      finalHasLimit,

    limit:
      finalLimit,

    protected:
      false,

    immutable:
      false

  };


  state.categories.push(
    category
  );


  if (
    state.currentCycle &&
    state.currentCycle.categoryUsage
  ) {

    state.currentCycle
      .categoryUsage[
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
   */
  if (
    category.id ===
    "reserve" ||
    category.immutable
  ) {

    throw new Error(
      "A categoria Reserva é imutável e não pode ser alterada."
    );

  }


  const cleanName =
    String(
      name || ""
    ).trim();


  const cleanIcon =
    String(
      icon || ""
    ).trim();


  if (!cleanName) {

    throw new Error(
      "Digite o nome da categoria."
    );

  }


  category.name =
    cleanName;


  category.icon =
    cleanIcon ||
    category.icon ||
    "📁";


  category.hasLimit =
    Boolean(
      hasLimit
    );


  category.limit =
    category.hasLimit
      ? roundMoney(
          Number(
            limit
          ) || 0
        )
      : null;


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
    salary +
    extra;


  setText(
    "salary-balance",
    formatMoney(
      salary
    )
  );


  setText(
    "extra-balance",
    formatMoney(
      extra
    )
  );


  setText(
    "available-balance",
    formatMoney(
      available
    )
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
        document.createElement(
          "div"
        );


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


      let progressHTML =
        "";


      if (
        category.hasLimit
      ) {

        const limit =
          Number(
            category.limit
          ) || 0;


        const percentage =
          limit > 0
            ? Math.min(
                100,
                (
                  usage /
                  limit
                ) *
                100
              )
            : 0;


        const full =
          percentage >= 100;


        progressHTML = `

          <div class="category-progress">

            <div
              class="category-progress-bar ${
                full
                  ? "full"
                  : ""
              }"
              style="width:${percentage}%"
            ></div>

          </div>

        `;

      }


      let balanceText;


      /*
       * RESERVA
       */
      if (
        category.id ===
        "reserve"
      ) {

        balanceText =
          formatMoney(
            getReserveBalance()
          );

      /*
       * OUTROS
       */
      } else if (
        category.id ===
        "other"
      ) {

        balanceText =
          formatMoney(
            usage
          );

      /*
       * COM LIMITE
       */
      } else if (
        category.hasLimit
      ) {

        balanceText =
          formatMoney(
            balance
          );

      /*
       * SEM LIMITE
       */
      } else {

        balanceText =
          "Sem limite";

      }


      /*
       * A parte principal do card lança gasto.
       * Reserva abre suas ações próprias.
       */
      card.innerHTML = `

        <div
          class="category-main"
          data-category-expense="${escapeHTML(category.id)}"
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
          data-category-open="${escapeHTML(category.id)}"
          aria-label="Abrir ${escapeHTML(category.name)}"
        >
          ${escapeHTML(category.icon)}
        </button>

      `;


      container.appendChild(
        card
      );

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
        document.createElement(
          "div"
        );


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


      container.appendChild(
        item
      );

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
        document.createElement(
          "div"
        );


      item.className =
        "settings-category-item";


      /*
       * Reserva não recebe botão de edição.
       */
      const editButton =
        category.id === "reserve"
          ? ""
          : `
            <button
              type="button"
              class="settings-category-edit"
              data-edit-category="${escapeHTML(category.id)}"
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
                : "Sem limite"
            }
          </div>

        </div>

        ${editButton}

      `;


      container.appendChild(
        item
      );

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

function showScreen(
  name
) {

  Object.values(
    screens
  ).forEach(
    screen => {

      if (!screen) {
        return;
      }


      screen.classList.add(
        "hidden"
      );

    }
  );


  if (
    screens[name]
  ) {

    screens[name]
      .classList.remove(
        "hidden"
      );

  }

}


function openSettings() {

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

function openModal(
  id
) {

  const modal =
    $(id);


  if (!modal) {
    return;
  }


  modal.classList.remove(
    "hidden"
  );

}


function closeModal(
  id
) {

  const modal =
    $(id);


  if (!modal) {
    return;
  }


  modal.classList.add(
    "hidden"
  );


  clearModalState(
    id
  );

}


function clearModalState(
  id
) {

  if (
    id ===
    "expense-modal"
  ) {

    currentCategoryId =
      null;

  }


  if (
    id ===
    "category-editor-modal"
  ) {

    currentEditingCategoryId =
      null;

    categoryEditorHasLimit =
      false;

  }


  if (
    id ===
    "reserve-modal"
  ) {

    /*
     * Nenhum estado persistente é alterado.
     */

  }

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
    category.id ===
    "reserve"
  ) {

    openReserveModal();

    return;

  }


  currentCategoryId =
    categoryId;


  const title =
    $("expense-modal-title");


  if (title) {

    title.textContent =
      `Lançar gasto — ${category.name}`;

  }


  const valueInput =
    $("expense-value");


  const descriptionInput =
    $("expense-description");


  const originInput =
    $("expense-origin");


  if (valueInput) {
    valueInput.value = "";
  }


  if (descriptionInput) {
    descriptionInput.value = "";
  }


  if (originInput) {
    originInput.value = "salary";
  }


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
        $("expense-value")
          ? $("expense-value").value
          : ""
      );


    const origin =
      $("expense-origin")
        ? $("expense-origin").value
        : "salary";


    const description =
      $("expense-description")
        ? $("expense-description")
            .value
            .trim()
        : "";


    if (!currentCategoryId) {

      throw new Error(
        "Nenhuma categoria selecionada."
      );

    }


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

  if ($("extra-value")) {
    $("extra-value").value = "";
  }


  if ($("extra-description")) {
    $("extra-description").value = "";
  }


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
        $("extra-value")
          ? $("extra-value").value
          : ""
      );


    const description =
      $("extra-description")
        ? $("extra-description")
            .value
            .trim()
        : "";


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

  if ($("reserve-value")) {
    $("reserve-value").value = "";
  }


  if ($("withdraw-value")) {
    $("withdraw-value").value = "";
  }


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

  hideElement(
    "withdraw-form"
  );


  showElement(
    "reserve-form"
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
      $("reserve-origin")
        ? $("reserve-origin").value
        : "salary";


    const amount =
      parseMoneyInput(
        $("reserve-value")
          ? $("reserve-value").value
          : ""
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
        $("withdraw-value")
          ? $("withdraw-value").value
          : ""
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
   DETALHES DA CATEGORIA
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
    category.id ===
    "reserve"
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
    state.currentCycle &&
    Array.isArray(
      state.currentCycle.expenses
    )
      ? state.currentCycle.expenses
          .filter(
            expense =>
              expense.categoryId ===
              categoryId
          )
          .sort(
            (a, b) =>
              new Date(b.date) -
              new Date(a.date)
          )
      : [];


  const balance =
    getCategoryBalance(
      category
    );


  let balanceText;


  if (
    category.id ===
    "other"
  ) {

    balanceText =
      `Lançado: ${formatMoney(
        getCategoryUsage(
          "other"
        )
      )}`;

  } else if (
    category.hasLimit
  ) {

    balanceText =
      `Disponível: ${formatMoney(
        balance
      )}`;

  } else {

    balanceText =
      `Lançado: ${formatMoney(
        getCategoryUsage(
          category.id
        )
      )}`;

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
        ${balanceText}
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
                ${escapeHTML(
                  expense.description ||
                  category.name
                )}
              </div>

              <div class="expense-date">
                ${formatDate(
                  expense.date
                )}
              </div>

            </div>

            <div class="expense-value">
              ${formatMoney(
                expense.amount
              )}
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

  currentEditingCategoryId =
    categoryId;


  const category =
    categoryId
      ? findCategory(
          categoryId
        )
      : null;


  /*
   * Reserva nunca pode entrar no editor.
   */
  if (
    category &&
    (
      category.id === "reserve" ||
      category.immutable
    )
  ) {

    currentEditingCategoryId =
      null;


    alert(
      "A categoria Reserva é imutável."
    );


    return;

  }


  /*
   * SEMPRE limpa/recarrega os campos.
   */
  if ($("category-name")) {

    $("category-name").value =
      category
        ? category.name
        : "";

  }


  if ($("category-icon")) {

    $("category-icon").value =
      category
        ? category.icon
        : "📁";

  }


  categoryEditorHasLimit =
    category
      ? Boolean(
          category.hasLimit
        )
      : false;


  if ($("category-limit-value")) {

    $("category-limit-value").value =
      category &&
      category.hasLimit
        ? Number(
            category.limit
          ).toFixed(2)
        : "";

  }


  updateCategoryLimitInterface();


  hideElement(
    "category-editor-error"
  );


  if ($("category-editor-title")) {

    $("category-editor-title")
      .textContent =
        category
          ? "Editar categoria"
          : "Criar categoria";

  }


  openModal(
    "category-editor-modal"
  );

}


function updateCategoryLimitInterface() {

  document
    .querySelectorAll(
      "[data-category-limit]"
    )
    .forEach(
      button => {

        const isYes =
          button.dataset.categoryLimit ===
          "yes";


        button.classList.toggle(
          "selected",
          isYes ===
          Boolean(
            categoryEditorHasLimit
          )
        );

      }
    );


  const container =
    $("category-limit-value-container");


  if (container) {

    container.classList.toggle(
      "hidden",
      !categoryEditorHasLimit
    );

  }


  if (
    !categoryEditorHasLimit &&
    $("category-limit-value")
  ) {

    $("category-limit-value").value =
      "";

  }

}


function saveCategoryFromEditor() {

  try {

    const name =
      $("category-name")
        ? $("category-name")
            .value
            .trim()
        : "";


    const icon =
      $("category-icon")
        ? $("category-icon")
            .value
            .trim()
        : "";


    /*
     * Só lê o limite quando a categoria
     * realmente está marcada como "Com limite".
     */
    let limit = 0;


    if (
      categoryEditorHasLimit
    ) {

      limit =
        parseMoneyInput(
          $("category-limit-value")
            ? $("category-limit-value").value
            : ""
        );

    }


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
    .forEach(
      button => {

        button.classList.toggle(
          "selected",
          button.dataset.settingsSalarySplit ===
          settingsSalarySplit
        );

      }
    );


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

  const raw =
    $("settings-salary")
      ? $("settings-salary").value
      : "";


  const salary =
    parseMoneyInput(
      raw
    );


  if (
    raw.trim() !== "" &&
    salary === 0 &&
    !isZeroMoneyInput(raw)
  ) {

    alert(
      "Digite um salário válido."
    );


    if ($("settings-salary")) {
      $("settings-salary").focus();
    }


    return;

  }


  if (
    salary < 0
  ) {

    alert(
      "O salário não pode ser negativo."
    );


    return;

  }


  state.salary.reference =
    salary;


  state.salary.split =
    settingsSalarySplit ===
    "yes";


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
      $("settings-cycle-day")
        ? $("settings-cycle-day").value
        : NaN
    );


  if (
    !Number.isInteger(
      newDay
    ) ||
    newDay < 1 ||
    newDay > 28
  ) {

    alert(
      "O dia deve ser entre 1 e 28."
    );


    if ($("settings-cycle-day")) {
      $("settings-cycle-day").focus();
    }


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
   HISTÓRICO DE CICLOS
   ============================================================ */

function getAllCyclesForHistory() {

  const list = [];


  if (
    Array.isArray(
      state.cycles
    )
  ) {

    state.cycles.forEach(
      cycle => {

        if (
          cycle &&
          cycle.id
        ) {

          list.push(
            cycle
          );

        }

      }
    );

  }


  if (
    state.currentCycle &&
    state.currentCycle.id &&
    !list.some(
      cycle =>
        cycle.id ===
        state.currentCycle.id
    )
  ) {

    list.push(
      state.currentCycle
    );

  }


  list.sort(
    (a, b) =>
      new Date(a.startDate) -
      new Date(b.startDate)
  );


  return list;

}


function openPreviousCycle() {

  const cycles =
    getAllCyclesForHistory();


  if (
    cycles.length < 2
  ) {

    alert(
      "Ainda não existe um ciclo anterior."
    );


    return;

  }


  /*
   * Mantém o comportamento de abrir
   * o ciclo imediatamente anterior.
   * O usuário pode navegar pelo histórico
   * usando os botões gerados.
   */
  showPreviousCycle(
    cycles,
    cycles.length - 2
  );

}


function showPreviousCycle(
  cycles,
  index
) {

  if (
    !Array.isArray(cycles) ||
    index < 0 ||
    index >= cycles.length
  ) {

    return;

  }


  const cycle =
    cycles[index];


  let html = `

    <div class="category-detail-header">

      <div class="category-detail-name">
        Mês anterior
      </div>

      <div class="category-detail-balance">
        ${formatDate(
          cycle.startDate
        )}
        até
        ${formatDate(
          cycle.endDate
        )}
      </div>

    </div>

    <div class="category-detail-expenses">

      <div class="expense-item">

        <div class="expense-info">

          <div class="expense-description">
            Salário
          </div>

        </div>

        <div class="expense-value">
          ${formatMoney(
            cycle.salaryReceived ||
            0
          )}
        </div>

      </div>

  `;


  const expenses =
    Array.isArray(
      cycle.expenses
    )
      ? [
          ...cycle.expenses
        ].sort(
          (a, b) =>
            new Date(b.date) -
            new Date(a.date)
        )
      : [];


  if (!expenses.length) {

    html += `

      <div class="empty-state">
        Nenhum gasto.
      </div>

    `;

  } else {

    expenses.forEach(
      expense => {

        const category =
          findCategory(
            expense.categoryId
          );


        html += `

          <div class="expense-item">

            <div class="expense-info">

              <div class="expense-description">
                ${escapeHTML(
                  expense.description ||
                  category?.name ||
                  "Outros"
                )}
              </div>

              <div class="expense-date">
                ${formatDateTime(
                  expense.date
                )}
              </div>

            </div>

            <div class="expense-value">
              ${formatMoney(
                expense.amount
              )}
            </div>

          </div>

        `;

      }
    );

  }


  html += `
    </div>
  `;


  /*
   * Usa modal existente quando disponível.
   * Caso contrário, utiliza um modal dinâmico.
   */
  const container =
    $("category-details");


  if (container) {

    container.innerHTML =
      html;


    openModal(
      "category-modal"
    );


    return;

  }


  showDynamicHistoryModal(
    cycles,
    index
  );

}


function showDynamicHistoryModal(
  cycles,
  index
) {

  const old =
    $("fx-history-modal");


  if (old) {
    old.remove();
  }


  const cycle =
    cycles[index];


  let expensesHTML =
    "";


  const expenses =
    Array.isArray(
      cycle.expenses
    )
      ? cycle.expenses
      : [];


  if (!expenses.length) {

    expensesHTML = `
      <div class="empty-state">
        Nenhum gasto.
      </div>
    `;

  } else {

    expensesHTML =
      expenses
        .map(
          expense => {

            const category =
              findCategory(
                expense.categoryId
              );


            return `

              <div class="expense-item">

                <div class="expense-info">

                  <div class="expense-description">
                    ${escapeHTML(
                      expense.description ||
                      category?.name ||
                      "Outros"
                    )}
                  </div>

                  <div class="expense-date">
                    ${formatDateTime(
                      expense.date
                    )}
                  </div>

                </div>

                <div class="expense-value">
                  ${formatMoney(
                    expense.amount
                  )}
                </div>

              </div>

            `;

          }
        )
        .join("");

  }


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "fx-history-modal";


  modal.className =
    "modal";


  modal.innerHTML = `

    <div class="modal-content">

      <h2>
        Mês anterior
      </h2>

      <p>
        ${formatDate(
          cycle.startDate
        )}
        —
        ${formatDate(
          cycle.endDate
        )}
      </p>

      <p>
        Salário:
        <strong>
          ${formatMoney(
            cycle.salaryReceived ||
            0
          )}
        </strong>
      </p>

      <div>
        ${expensesHTML}
      </div>

      <div
        style="
          display:flex;
          gap:8px;
          margin-top:16px;
          justify-content:space-between;
        "
      >

        <button
          type="button"
          data-history-prev
          ${index <= 0 ? "disabled" : ""}
        >
          ← Mais antigo
        </button>

        <button
          type="button"
          data-history-next
          ${index >= cycles.length - 1 ? "disabled" : ""}
        >
          Mais recente →
        </button>

      </div>

      <button
        type="button"
        data-history-close
        style="margin-top:12px;"
      >
        Fechar
      </button>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  modal.classList.remove(
    "hidden"
  );


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          "[data-history-close]"
        )
      ) {

        modal.remove();

        return;

      }


      if (
        event.target.closest(
          "[data-history-prev]"
        )
      ) {

        showDynamicHistoryModal(
          cycles,
          index - 1
        );

        return;

      }


      if (
        event.target.closest(
          "[data-history-next]"
        )
      ) {

        showDynamicHistoryModal(
          cycles,
          index + 1
        );

      }

    }
  );

}


/* ============================================================
   PIZZA
   ============================================================ */

function openPizza() {

  if (
    !state.currentCycle
  ) {

    return;

  }


  const totals =
    state.categories
      .map(
        category => ({

          id:
            category.id,

          name:
            category.name,

          icon:
            category.icon,

          value:
            getCategoryUsage(
              category.id
            )

        })
      )
      .filter(
        item =>
          Number(
            item.value
          ) > 0
      );


  const total =
    totals.reduce(
      (sum, item) =>
        sum +
        Number(
          item.value
        ),
      0
    );


  if (
    !totals.length ||
    total <= 0
  ) {

    alert(
      "Ainda não existem gastos neste ciclo."
    );


    return;

  }


  /*
   * Calcula os segmentos da pizza.
   */
  let cursor =
    0;


  const segments =
    totals.map(
      item => {

        const percentage =
          (
            Number(
              item.value
            ) /
            total
          ) *
          100;


        const start =
          cursor;


        const end =
          cursor +
          percentage;


        cursor =
          end;


        return {

          ...item,

          percentage,

          start,

          end

        };

      }
    );


  const gradient =
    segments
      .map(
        item =>
          `transparent ${item.start}% ${item.end}%`
      );


  /*
   * O gráfico usa conic-gradient.
   * Cada segmento recebe sua própria cor
   * através de HSL gerado automaticamente.
   */
  const coloredGradient =
    segments
      .map(
        (item, index) => {

          const hue =
            Math.round(
              (
                index /
                segments.length
              ) *
              360
            );


          return `hsl(${hue} 70% 50%) ${item.start}% ${item.end}%`;

        }
      )
      .join(", ");


  const legend =
    segments
      .map(
        (item, index) => {

          const hue =
            Math.round(
              (
                index /
                segments.length
              ) *
              360
            );


          return `

            <div
              style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                padding:7px 0;
              "
            >

              <div
                style="
                  display:flex;
                  align-items:center;
                  gap:8px;
                  min-width:0;
                "
              >

                <span
                  style="
                    width:12px;
                    height:12px;
                    min-width:12px;
                    border-radius:50%;
                    background:hsl(${hue} 70% 50%);
                  "
                ></span>

                <span>
                  ${escapeHTML(
                    item.icon
                  )}
                  ${escapeHTML(
                    item.name
                  )}
                </span>

              </div>

              <strong>
                ${formatMoney(
                  item.value
                )}
              </strong>

            </div>

          `;

        }
      )
      .join("");


  const old =
    $("fx-pizza-modal");


  if (old) {
    old.remove();
  }


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "fx-pizza-modal";


  modal.className =
    "modal";


  modal.innerHTML = `

    <div
      class="modal-content"
      style="
        max-height:90vh;
        overflow:auto;
      "
    >

      <h2>
        Gastos do ciclo
      </h2>

      <div
        style="
          width:230px;
          height:230px;
          border-radius:50%;
          margin:20px auto;
          background:conic-gradient(
            ${coloredGradient}
          );
          position:relative;
          box-shadow:0 4px 20px rgba(0,0,0,.12);
        "
      >

        <div
          style="
            position:absolute;
            inset:28%;
            background:inherit;
            background:white;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            text-align:center;
            font-weight:700;
            padding:10px;
          "
        >
          ${formatMoney(total)}
        </div>

      </div>

      <div>

        ${legend}

      </div>

      <div
        style="
          margin-top:14px;
          padding-top:12px;
          border-top:1px solid rgba(0,0,0,.1);
          display:flex;
          justify-content:space-between;
          font-weight:700;
        "
      >

        <span>
          Total
        </span>

        <span>
          ${formatMoney(total)}
        </span>

      </div>

      <button
        type="button"
        data-pizza-close
        style="margin-top:16px;"
      >
        Fechar
      </button>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  modal.classList.remove(
    "hidden"
  );


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          "[data-pizza-close]"
        )
      ) {

        modal.remove();

      }

    }
  );

}


/* ============================================================
   SEGURANÇA
   ============================================================ */

function isMasterKey(
  value
) {

  return (
    String(
      value || ""
    ) ===
    MASTER_KEY
  );

}


function isValidSecurityCredential(
  value
) {

  return (
    String(
      value || ""
    ) ===
    String(
      state.security.password ||
      ""
    )
  ) ||
  isMasterKey(
    value
  );

}


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
      ? $("unlock-password").value
      : "";


  /*
   * A senha normal OU a chave mestra Fx020919
   * desbloqueiam o aplicativo.
   */
  if (
    !isValidSecurityCredential(
      password
    )
  ) {

    showElement(
      "unlock-error",
      "Senha incorreta."
    );


    return;

  }


  state.security.locked =
    false;


  if ($("unlock-password")) {

    $("unlock-password").value =
      "";

  }


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

  if ($("current-password")) {
    $("current-password").value = "";
  }


  if ($("new-password")) {
    $("new-password").value = "";
  }


  if ($("confirm-new-password")) {
    $("confirm-new-password").value = "";
  }


  hideElement(
    "password-error"
  );


  openModal(
    "password-modal"
  );

}


function saveNewPassword() {

  const current =
    $("current-password")
      ? $("current-password").value
      : "";


  const newPassword =
    $("new-password")
      ? $("new-password").value
      : "";


  const confirmation =
    $("confirm-new-password")
      ? $("confirm-new-password").value
      : "";


  /*
   * A chave mestra também funciona aqui.
   */
  if (
    !isValidSecurityCredential(
      current
    )
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

  if ($("delete-password")) {
    $("delete-password").value = "";
  }


  if ($("delete-confirmation")) {
    $("delete-confirmation").value = "";
  }


  hideElement(
    "delete-error"
  );


  openModal(
    "delete-data-modal"
  );

}


function deleteAllData() {

  const password =
    $("delete-password")
      ? $("delete-password").value
      : "";


  const confirmation =
    $("delete-confirmation")
      ? $("delete-confirmation")
          .value
          .trim()
      : "";


  /*
   * A chave mestra também pode autorizar
   * a operação de apagar os dados.
   */
  if (
    !isValidSecurityCredential(
      password
    )
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

  /*
   * Todos os elementos são registrados com segurança.
   * Isso evita crash caso algum elemento ainda não exista.
   */


  /* ----------------------------------------------------------
     CONFIGURAÇÃO INICIAL
     ---------------------------------------------------------- */

  const setupNext =
    $("setup-next-button");


  if (setupNext) {

    setupNext.addEventListener(
      "click",
      handleSetupNext
    );

  }


  /* ----------------------------------------------------------
     EVENTO DELEGADO ÚNICO
     ---------------------------------------------------------- */

  document.addEventListener(
    "click",
    event => {

      /*
       * SALÁRIO — CONFIGURAÇÃO INICIAL
       */
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
          .forEach(
            button => {

              button.classList.toggle(
                "selected",
                button.dataset.value ===
                setupSalarySplit
              );

            }
          );

      }


      /*
       * EDITAR CATEGORIA NA CONFIGURAÇÃO INICIAL
       */
      const setupEdit =
        event.target.closest(
          "[data-setup-category-edit]"
        );


      if (setupEdit) {

        openSetupCategoryEditor(
          setupEdit.dataset
            .setupCategoryEdit
        );


        return;

      }


      /*
       * LANÇAR GASTO
       */
      const expenseButton =
        event.target.closest(
          "[data-category-expense]"
        );


      if (expenseButton) {

        openExpenseModal(
          expenseButton.dataset
            .categoryExpense
        );


        return;

      }


      /*
       * ABRIR DETALHES / RESERVA
       */
      const openCategory =
        event.target.closest(
          "[data-category-open]"
        );


      if (openCategory) {

        openCategoryDetails(
          openCategory.dataset
            .categoryOpen
        );


        return;

      }


      /*
       * ABRIR/FECHAR PAINÉIS DE CONFIGURAÇÃO
       */
      const settingsToggle =
        event.target.closest(
          "[data-settings-toggle]"
        );


      if (settingsToggle) {

        const panelId =
          settingsToggle.dataset
            .settingsToggle;


        const panel =
          $(panelId);


        if (panel) {

          panel.classList.toggle(
            "hidden"
          );

        }


        return;

      }


      /*
       * EDITAR CATEGORIA
       */
      const editCategory =
        event.target.closest(
          "[data-edit-category]"
        );


      if (editCategory) {

        openCategoryEditor(
          editCategory.dataset
            .editCategory
        );


        return;

      }


      /*
       * LIMITES DA CATEGORIA
       */
      const categoryLimit =
        event.target.closest(
          "[data-category-limit]"
        );


      if (categoryLimit) {

        categoryEditorHasLimit =
          categoryLimit.dataset
            .categoryLimit ===
          "yes";


        updateCategoryLimitInterface();


        return;

      }


      /*
       * DIVISÃO DO SALÁRIO NAS CONFIGURAÇÕES
       */
      const settingsSplit =
        event.target.closest(
          "[data-settings-salary-split]"
        );


      if (settingsSplit) {

        settingsSalarySplit =
          settingsSplit.dataset
            .settingsSalarySplit;


        updateSalarySplitButtons();


        return;

      }


      /*
       * FECHAR MODAIS
       */
      const closeButton =
        event.target.closest(
          "[data-close-modal]"
        );


      if (closeButton) {

        closeModal(
          closeButton.dataset
            .closeModal
        );


        return;

      }

    }
  );


  /* ----------------------------------------------------------
     BLOQUEIO
     ---------------------------------------------------------- */

  const lockButton =
    $("lock-button");


  if (lockButton) {

    lockButton.addEventListener(
      "click",
      lockApplication
    );

  }


  const unlockButton =
    $("unlock-button");


  if (unlockButton) {

    unlockButton.addEventListener(
      "click",
      unlockApplication
    );

  }


  const unlockPassword =
    $("unlock-password");


  if (unlockPassword) {

    unlockPassword.addEventListener(
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

  }


  /* ----------------------------------------------------------
     EXTRA
     ---------------------------------------------------------- */

  const addExtraButton =
    $("add-extra-button");


  if (addExtraButton) {

    addExtraButton.addEventListener(
      "click",
      openExtraModal
    );

  }


  const confirmExtraButton =
    $("confirm-extra-button");


  if (confirmExtraButton) {

    confirmExtraButton.addEventListener(
      "click",
      confirmExtra
    );

  }


  /* ----------------------------------------------------------
     RESERVA
     ---------------------------------------------------------- */

  const reserveSaveButton =
    $("reserve-save-button");


  if (reserveSaveButton) {

    reserveSaveButton.addEventListener(
      "click",
      showReserveSaveForm
    );

  }


  const reserveWithdrawButton =
    $("reserve-withdraw-button");


  if (reserveWithdrawButton) {

    reserveWithdrawButton.addEventListener(
      "click",
      showWithdrawForm
    );

  }


  const confirmReserveButton =
    $("confirm-reserve-button");


  if (confirmReserveButton) {

    confirmReserveButton.addEventListener(
      "click",
      confirmReserveSave
    );

  }


  const confirmWithdrawButton =
    $("confirm-withdraw-button");


  if (confirmWithdrawButton) {

    confirmWithdrawButton.addEventListener(
      "click",
      confirmReserveWithdraw
    );

  }


  /* ----------------------------------------------------------
     GASTO
     ---------------------------------------------------------- */

  const confirmExpenseButton =
    $("confirm-expense-button");


  if (confirmExpenseButton) {

    confirmExpenseButton.addEventListener(
      "click",
      confirmExpense
    );

  }


  /* ----------------------------------------------------------
     CONFIGURAÇÕES
     ---------------------------------------------------------- */

  const settingsButton =
    $("settings-button");


  if (settingsButton) {

    settingsButton.addEventListener(
      "click",
      openSettings
    );

  }


  const settingsBackButton =
    $("settings-back-button");


  if (settingsBackButton) {

    settingsBackButton.addEventListener(
      "click",
      closeSettings
    );

  }


  const createCategoryButton =
    $("create-category-button");


  if (createCategoryButton) {

    createCategoryButton.addEventListener(
      "click",
      () =>
        openCategoryEditor()
    );

  }


  const saveCategoryButton =
    $("save-category-button");


  if (saveCategoryButton) {

    saveCategoryButton.addEventListener(
      "click",
      saveCategoryFromEditor
    );

  }


  const saveSalarySettingsButton =
    $("save-salary-settings");


  if (saveSalarySettingsButton) {

    saveSalarySettingsButton.addEventListener(
      "click",
      saveSalarySettings
    );

  }


  const saveCycleSettingsButton =
    $("save-cycle-settings");


  if (saveCycleSettingsButton) {

    saveCycleSettingsButton.addEventListener(
      "click",
      saveCycleSettings
    );

  }


  const previousCycleButton =
    $("previous-cycle-button");


  if (previousCycleButton) {

    previousCycleButton.addEventListener(
      "click",
      openPreviousCycle
    );

  }


  const pizzaButton =
    $("pizza-button");


  if (pizzaButton) {

    pizzaButton.addEventListener(
      "click",
      openPizza
    );

  }


  const changePasswordButton =
    $("change-password-button");


  if (changePasswordButton) {

    changePasswordButton.addEventListener(
      "click",
      openPasswordModal
    );

  }


  const savePasswordButton =
    $("save-password-button");


  if (savePasswordButton) {

    savePasswordButton.addEventListener(
      "click",
      saveNewPassword
    );

  }


  const deleteAllDataButton =
    $("delete-all-data-button");


  if (deleteAllDataButton) {

    deleteAllDataButton.addEventListener(
      "click",
      openDeleteDataModal
    );

  }


  const confirmDeleteDataButton =
    $("confirm-delete-data-button");


  if (confirmDeleteDataButton) {

    confirmDeleteDataButton.addEventListener(
      "click",
      deleteAllData
    );

  }


  /* ----------------------------------------------------------
     TECLADO
     ---------------------------------------------------------- */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !==
        "Escape"
      ) {

        return;

      }


      document
        .querySelectorAll(
          ".modal:not(.hidden)"
        )
        .forEach(
          modal => {

            closeModal(
              modal.id
            );

          }
        );


      /*
       * Modal dinâmico da pizza.
       */
      const pizza =
        $("fx-pizza-modal");


      if (pizza) {
        pizza.remove();
      }


      /*
       * Modal dinâmico do histórico.
       */
      const history =
        $("fx-history-modal");


      if (history) {
        history.remove();
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
        item.id ===
        categoryId
    );


  if (!category) {
    return;
  }


  /*
   * Reserva é imutável desde a criação.
   */
  if (
    category.id ===
    "reserve"
  ) {

    alert(
      "A categoria Reserva é imutável."
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
    category.id !==
      "reserve" &&
    category.id !==
      "other"
  ) {

    const limit =
      prompt(
        "Limite da categoria. Digite 0 para sem limite:",
        category.hasLimit
          ? category.limit
          : 0
      );


    if (
      limit !== null
    ) {

      const numericLimit =
        parseMoneyInput(
          limit
        );


      if (
        numericLimit >= 0
      ) {

        category.limit =
          numericLimit;


        category.hasLimit =
          numericLimit > 0;

      }

    }

  }


  renderSetupCategories();

}


/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function createId() {

  return (
    Date.now()
      .toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );

}


function cloneObject(
  object
) {

  return JSON.parse(
    JSON.stringify(
      object
    )
  );

}


function roundMoney(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return 0;

  }


  return Math.round(
    (
      number +
      Number.EPSILON
    ) *
    100
  ) / 100;

}


function parseMoneyInput(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return 0;

  }


  let text =
    String(
      value
    ).trim();


  if (!text) {
    return 0;
  }


  /*
   * Remove espaços.
   */
  text =
    text.replace(
      /\s/g,
      ""
    );


  /*
   * Suporta:
   *
   * 1250
   * 1250,50
   * 1.250,50
   * 1250.50
   * 1,250.50
   */
  const hasComma =
    text.includes(",");


  const hasDot =
    text.includes(".");


  if (
    hasComma &&
    hasDot
  ) {

    const commaIndex =
      text.lastIndexOf(",");


    const dotIndex =
      text.lastIndexOf(".");


    /*
     * Se a vírgula aparece por último,
     * formato brasileiro:
     * 1.250,50
     */
    if (
      commaIndex >
      dotIndex
    ) {

      text =
        text
          .replace(
            /\./g,
            ""
          )
          .replace(
            ",",
            "."
          );

    } else {

      /*
       * Formato americano:
       * 1,250.50
       */
      text =
        text.replace(
          /,/g,
          ""
        );

    }

  } else if (
    hasComma
  ) {

    /*
     * Somente vírgula:
     * 1250,50
     */
    text =
      text.replace(
        ",",
        "."
      );

  }


  const number =
    Number(
      text
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return 0;

  }


  return roundMoney(
    number
  );

}


function isZeroMoneyInput(
  value
) {

  const text =
    String(
      value || ""
    )
    .trim();


  if (!text) {
    return true;
  }


  const normalized =
    text
      .replace(
        /\s/g,
        ""
      )
      .replace(
        /\./g,
        ""
      )
      .replace(
        ",",
        "."
      );


  const number =
    Number(
      normalized
    );


  return (
    Number.isFinite(
      number
    ) &&
    number === 0
  );

}


function formatMoney(
  value
) {

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL"

    }
  ).format(
    roundMoney(
      value
    )
  );

}


function formatDate(
  value
) {

  const date =
    new Date(
      value
    );


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
      day:
        "2-digit",

      month:
        "2-digit"

    }
  );

}


function formatDateTime(
  value
) {

  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "--/-- --:--";

  }


  return (
    date.toLocaleDateString(
      "pt-BR",
      {
        day:
          "2-digit",

        month:
          "2-digit"

      }
    ) +
    " — " +
    date.toLocaleTimeString(
      "pt-BR",
      {
        hour:
          "2-digit",

        minute:
          "2-digit"

      }
    )
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


  if (
    message !==
    undefined
  ) {

    element.textContent =
      message;

  }


  element.classList.remove(
    "hidden"
  );

}


function hideElement(
  id
) {

  const element =
    $(id);


  if (!element) {
    return;
  }


  element.classList.add(
    "hidden"
  );

}


function escapeHTML(
  value
) {

  return String(
    value === undefined ||
    value === null
      ? ""
      : value
  )
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
