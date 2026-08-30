/* FX.01 - AUDITORIA COMPLETA 30/08/2026 */
function roundMoney(v){ return Math.round((Number(v)+Number.EPSILON)*100)/100; }

const LS_KEYS = {
  USER: 'fx01_user',
  SETTINGS: 'fx01_settings',
  DATA: 'fx01_data'
};

const DEFAULT_CATEGORIES = [
  { id: 'alimentacao', name: 'Alimentação', icon: '🍔' },
  { id: 'transporte', name: 'Transporte', icon: '🚌' },
  { id: 'moradia', name: 'Moradia', icon: '🏠' },
  { id: 'lazer', name: 'Lazer', icon: '🎮' },
  { id: 'saude', name: 'Saúde', icon: '🏥' },
  { id: 'educacao', name: 'Educação', icon: '📚' },
  { id: 'trabalho', name: 'Trabalho', icon: '💼' },
  { id: 'reserva', name: 'Reserva', icon: '💰' }
];

const THEMES = {
  current: { name: 'Roxo FX', class: 'theme-fx' },
  ocean: { name: 'Ocean', class: 'theme-ocean' },
  forest: { name: 'Forest Gold', class: 'theme-forest' }
};

let state = {
  user: null,
  settings: JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS) || '{"appearance":"dark","theme":"current","lockEnabled":true}'),
  data: JSON.parse(localStorage.getItem(LS_KEYS.DATA) || '{"gastos":[],"reserva":0}'),
  registerStep: 1,
  tempRegister: {}
};

function saveSettings(){
  localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(state.settings));
  applyAppearance();
}
function saveUser(){ localStorage.setItem(LS_KEYS.USER, JSON.stringify(state.user)); }
function saveData(){ localStorage.setItem(LS_KEYS.DATA, JSON.stringify(state.data)); }

function applyAppearance(){
  document.documentElement.setAttribute('data-appearance', state.settings.appearance || 'dark');
  document.documentElement.setAttribute('data-theme', state.settings.theme || 'current');
  document.body.className = THEMES[state.settings.theme]?.class || 'theme-fx';
  if(state.settings.appearance === 'light') document.body.classList.add('light-mode');
  else document.body.classList.remove('light-mode');
}

// --- CADASTRO 2 ETAPAS ---
function showRegister(){
  state.registerStep = 1;
  renderRegister();
  document.getElementById('registerModal')?.classList.add('active');
}
function renderRegister(){
  const c = document.getElementById('registerContent');
  if(!c) return;
  if(state.registerStep === 1){
    c.innerHTML = `
      <h3>Cadastro - Acesso</h3>
      <input id="regUser" placeholder="Usuário *" value="${state.tempRegister.usuario||''}">
      <input id="regPass" type="password" placeholder="Senha *">
      <input id="regPass2" type="password" placeholder="Repetir senha *">
      <small id="regError" style="color:#ff6b6b"></small>
      <button onclick="validateStep1()">Próximo</button>
    `;
  } else {
    c.innerHTML = `
      <h3>Cadastro - Dados Pessoais</h3>
      <input id="regNome" placeholder="Nome completo *" value="${state.tempRegister.nomeCompleto||''}">
      <input id="regChamado" placeholder="Como gostaria de ser chamado ao bloquear a tela" value="${state.tempRegister.nomeBloqueio||''}">
      <input id="regPergunta" placeholder="Pergunta de recuperação de senha *" value="${state.tempRegister.pergunta||''}">
      <input id="regResposta" placeholder="Resposta da recuperação *" value="${state.tempRegister.resposta||''}">
      <small style="opacity:.7">Categorias pré-definidas serão mantidas automaticamente.</small>
      <small id="regError2" style="color:#ff6b6b"></small>
      <div style="display:flex;gap:8px">
        <button onclick="state.registerStep=1;renderRegister()" class="secondary">Voltar</button>
        <button onclick="finalizeRegister()">Finalizar Cadastro</button>
      </div>
    `;
  }
}
function validateStep1(){
  const u = document.getElementById('regUser').value.trim();
  const p = document.getElementById('regPass').value;
  const p2 = document.getElementById('regPass2').value;
  const err = document.getElementById('regError');
  if(!u){ err.textContent='Usuário obrigatório'; return; }
  if(!p){ err.textContent='Senha obrigatória'; return; }
  if(p !== p2){ err.textContent='Senhas não conferem'; return; }
  state.tempRegister.usuario = u;
  state.tempRegister.senha = p;
  state.registerStep = 2;
  renderRegister();
}
function finalizeRegister(){
  const nome = document.getElementById('regNome').value.trim();
  const chamado = document.getElementById('regChamado').value.trim();
  const pergunta = document.getElementById('regPergunta').value.trim();
  const resposta = document.getElementById('regResposta').value.trim();
  const err = document.getElementById('regError2');
  if(!nome){ err.textContent='Nome completo obrigatório'; return; }
  if(!pergunta || !resposta){ err.textContent='Pergunta e resposta de recuperação obrigatórias'; return; }
  state.user = {
    usuario: state.tempRegister.usuario,
    senha: state.tempRegister.senha,
    nomeCompleto: nome,
    nomeBloqueio: chamado || nome.split(' ')[0],
    perguntaRecuperacao: pergunta,
    respostaRecuperacao: resposta,
    categorias: DEFAULT_CATEGORIES
  };
  saveUser();
  document.getElementById('registerModal')?.classList.remove('active');
  initApp();
}

// --- RECUPERAÇÃO DE SENHA (PRESERVADA) ---
function showRecovery(){
  const u = state.user || JSON.parse(localStorage.getItem(LS_KEYS.USER)||'null');
  if(!u){ alert('Nenhum usuário cadastrado'); return; }
  const resp = prompt(`Pergunta: ${u.perguntaRecuperacao}\nDigite a resposta:`);
  if(resp && resp.toLowerCase().trim() === u.respostaRecuperacao.toLowerCase().trim()){
    alert(`Sua senha é: ${u.senha}`);
  } else if(resp!==null){ alert('Resposta incorreta'); }
}

// --- BLOQUEIO + BIOMETRIA ---
async function tryBiometric(){
  if(!('credentials' in navigator)) return false;
  try{
    const available = await navigator.credentials.get({publicKey:{challenge:new Uint8Array([1,2,3]), allowCredentials:[]}});
    return !!available;
  }catch(e){ return false; }
}
function lockScreen(){
  const modal = document.getElementById('lockScreen');
  if(!modal) return;
  const nome = state.user?.nomeBloqueio || state.user?.nomeCompleto || 'bem-vindo';
  document.getElementById('lockGreeting').textContent = `Olá, ${nome}`;
  modal.classList.add('active');
}
function unlockWithPassword(){
  const input = document.getElementById('lockPass').value;
  if(input === state.user?.senha){ document.getElementById('lockScreen').classList.remove('active'); }
  else { alert('Senha incorreta'); }
}
async function unlockWithBiometric(){
  if(window.Capacitor && window.Capacitor.Plugins?.BiometricAuth){
    try{
      await window.Capacitor.Plugins.BiometricAuth.authenticate({reason:'Desbloquear FX.01'});
      document.getElementById('lockScreen').classList.remove('active');
    }catch(e){ alert('Biometria falhou, use a senha'); }
  } else {
    alert('Biometria não disponível neste aparelho');
  }
}

// --- PERSONALIZAÇÃO ---
function renderPersonalizacao(){
  const container = document.getElementById('personalizacaoArea');
  if(!container) return;
  container.innerHTML = `
    <div class="card">
      <h4>Modo de Aparência</h4>
      <div class="theme-grid">
        <button class="${state.settings.appearance==='dark'?'active':''}" onclick="setAppearance('dark')">🌙 Modo escuro (padrão)</button>
        <button class="${state.settings.appearance==='light'?'active':''}" onclick="setAppearance('light')">☀️ Modo claro</button>
      </div>
    </div>
    <div class="card">
      <h4>Temas</h4>
      <div class="theme-grid">
        <button class="${state.settings.theme==='current'?'active':''}" onclick="setTheme('current')">💜 Roxo FX (Atual) - Profissional escuro com textura gradiente</button>
        <button class="${state.settings.theme==='ocean'?'active':''}" onclick="setTheme('ocean')">🌊 Ocean - Azul petróleo, ciano, glassmorphism</button>
        <button class="${state.settings.theme==='forest'?'active':''}" onclick="setTheme('forest')">🌲 Forest Gold - Verde musgo, dourado suave, textura papel</button>
      </div>
    </div>
  `;
}
function setAppearance(m){ state.settings.appearance = m; saveSettings(); renderPersonalizacao(); }
function setTheme(t){ state.settings.theme = t; saveSettings(); renderPersonalizacao(); }

// --- FINANCEIRO (PRESERVADO) ---
function addGasto(){
  const valor = roundMoney(document.getElementById('gastoValor')?.value || 0);
  if(!valor) return;
  state.data.gastos.push({valor, data: new Date().toISOString(), categoria: document.getElementById('gastoCat')?.value || 'alimentacao'});
  saveData();
  renderGastos();
}

// --- INIT ---
function renderGastos(){
  const list = document.getElementById('gastosList');
  if(!list) return;
  list.innerHTML = state.data.gastos.map(g=>`<div class="item">${g.categoria}: R$ ${g.valor.toFixed(2)}</div>`).join('');
}
function initApp(){
  state.user = JSON.parse(localStorage.getItem(LS_KEYS.USER) || 'null');
  state.settings = JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS) || '{"appearance":"dark","theme":"current"}');
  state.data = JSON.parse(localStorage.getItem(LS_KEYS.DATA) || '{"gastos":[],"reserva":0}');
  applyAppearance();
  if(!state.user){ showRegister(); return; }
  renderPersonalizacao();
  renderGastos();
  if(state.settings.lockEnabled) lockScreen();
}
document.addEventListener('DOMContentLoaded', initApp);
window.validateStep1 = validateStep1;
window.finalizeRegister = finalizeRegister;
window.setAppearance = setAppearance;
window.setTheme = setTheme;
window.showRecovery = showRecovery;
window.unlockWithPassword = unlockWithPassword;
window.unlockWithBiometric = unlockWithBiometric;
window.showRegister = showRegister;
window.addGasto = addGasto;
