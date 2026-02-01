// Correcao_testes/WISC_IV/script.js

const LAUDOS_KEY = "empresa_laudos_wisciv_v1";

let NORMAS = null;
async function carregarNormas(){
  if (NORMAS) return NORMAS;

  // CAMINHO ABSOLUTO CORRETO (com pasta principal)
  const url = "/Equilibrium_Neuro/Correcao_testes/WISC_IV/data/normas-wisciv.json";
  const resp = await fetch(url, { cache: "no-store" });

  if (!resp.ok) {
    throw new Error(`Falha ao carregar normas: ${url} (HTTP ${resp.status})`);
  }

  const json = await resp.json();
  if (!json || typeof json !== "object" || Object.keys(json).length === 0) {
    throw new Error("Normas carregadas, mas o JSON veio vazio ou inválido.");
  }

  NORMAS = json;
  return NORMAS;
}

// ================= SUBTESTES =================
const SUBTESTES = [
  { nome: "Cubos", codigo: "CB", id:"pb_CB" },
  { nome: "Semelhanças", codigo: "SM", id:"pb_SM" },
  { nome: "Dígitos", codigo: "DG", id:"pb_DG" },
  { nome: "Conceitos Figurativos", codigo: "CN", id:"pb_CN" },
  { nome: "Código", codigo: "CD", id:"pb_CD" },
  { nome: "Vocabulário", codigo: "VC", id:"pb_VC" },
  { nome: "Seq. de Números e Letras", codigo: "SNL", id:"pb_SNL" },
  { nome: "Raciocínio Matricial", codigo: "RM", id:"pb_RM" },
  { nome: "Compreensão", codigo: "CO", id:"pb_CO" },
  { nome: "Procurar Símbolos", codigo: "PS", id:"pb_PS" },
  { nome: "Completar Figuras", codigo: "CF", id:"pb_CF" },
  { nome: "Cancelamento", codigo: "CA", id:"pb_CA" },
  { nome: "Informação", codigo: "IN", id:"pb_IN" },
  { nome: "Aritmética", codigo: "AR", id:"pb_AR" },
  { nome: "Raciocínio com Palavras", codigo: "RP", id:"pb_RP" },
];

// ================= ÍNDICES =================
const INDICES = {
  ICV: { core: ["SM","VC","CO"], supl: ["IN","RP"], n: 3 },
  IOP: { core: ["CB","CN","RM"], supl: ["CF"], n: 3 },
  IMO: { core: ["DG","SNL"], supl: ["AR"], n: 2 },
  IVP: { core: ["CD","PS"], supl: ["CA"], n: 2 },
};

const QI_CORE = ["SM","VC","CO","CB","CN","RM","DG","SNL","CD","PS"];

// ================= IDADE =================
function calcularIdade(nascISO, aplISO){
  const n = new Date(nascISO);
  const a = new Date(aplISO);
  if (a < n) return null;

  let anos = a.getFullYear() - n.getFullYear();
  let meses = a.getMonth() - n.getMonth();
  if (a.getDate() < n.getDate()) meses--;
  if (meses < 0){ anos--; meses += 12; }

  return { anos, meses, totalMeses: anos * 12 + meses };
}

// ================= FAIXA ETÁRIA =================
function faixaEtaria(normas, idade){
  const total = idade.totalMeses;

  for (const faixa in normas){
    const [ini, fim] = faixa.split("-");
    if (!ini || !fim) continue;

    const [ai, mi] = ini.split(":").map(Number);
    const [af, mf] = fim.split(":").map(Number);

    if ([ai,mi,af,mf].some(isNaN)) continue;

    const min = ai * 12 + mi;
    const max = af * 12 + mf;

    if (total >= min && total <= max) return faixa;
  }
  return null;
}

// ================= CONVERSÃO =================
function brutoParaPonderado(normas, faixa, codigo, bruto){
  const regras = normas?.[faixa]?.subtestes?.[codigo];
  if (!Array.isArray(regras)) return null;

  const r = regras.find(x => bruto >= x.min && bruto <= x.max);
  return r ? Number(r.ponderado) : null;
}

function classificarPonderado(p){
  if (p <= 4) return "Muito Inferior";
  if (p <= 6) return "Inferior";
  if (p <= 8) return "Médio Inferior";
  if (p <= 11) return "Médio";
  if (p <= 13) return "Médio Superior";
  if (p <= 15) return "Superior";
  return "Muito Superior";
}

// ================= INPUTS =================
function montarInputsSubtestes(){
  const tbody = document.getElementById("tbodySubtestes");
  if (!tbody) return;

  tbody.innerHTML = "";
  SUBTESTES.forEach(s=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${s.nome}</b> <span class="muted">(${s.codigo})</span></td>
      <td><input type="number" min="0" id="${s.id}" placeholder="Bruto"></td>
    `;
    tbody.appendChild(tr);
  });
}

function atualizarPreviewIdade(){
  const nasc = document.getElementById("dataNascimento")?.value;
  const apl  = document.getElementById("dataAplicacao")?.value;

  const idadeEl = document.getElementById("idadeCalculada");
  const faixaEl = document.getElementById("faixaCalculada");

  if (!idadeEl || !faixaEl) return;

  if (!nasc || !apl) {
    idadeEl.textContent = "";
    faixaEl.textContent = "";
    return;
  }

  const idade = calcularIdade(nasc, apl);
  if (!idade) {
    idadeEl.textContent = "Datas inválidas.";
    faixaEl.textContent = "";
    return;
  }

  idadeEl.textContent =
    `Idade na aplicação: ${idade.anos} anos e ${idade.meses} meses.`;

  carregarNormas()
    .then(normas => {
      const faixa = faixaEtaria(normas, idade);
      faixaEl.textContent = faixa
        ? `Faixa normativa: ${faixa}`
        : "Faixa normativa: não encontrada.";
    })
    .catch(() => {
      faixaEl.textContent = "Erro ao carregar normas.";
    });
}


// ================= INIT =================
(function init(){
  if (document.getElementById("tbodySubtestes")){
    montarInputsSubtestes();
    document.getElementById("dataNascimento")?.addEventListener("change", atualizarPreviewIdade);
    document.getElementById("dataAplicacao")?.addEventListener("change", atualizarPreviewIdade);
  }
})();
