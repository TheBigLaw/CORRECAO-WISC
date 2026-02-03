// tests/wisciv/script.js

const LAUDOS_KEY = "empresa_laudos_wisciv_v1";

let NORMAS = null;
async function carregarNormas(){
  if(NORMAS) return NORMAS;
  const resp = await fetch("data/normas-wisciv.json", { cache:"no-store" });
  if(!resp.ok) throw new Error("Não foi possível carregar data/normas-wisciv.json");
  NORMAS = await resp.json();
  return NORMAS;
}

// Subtestes (ordem objetiva)
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
  // suplementares
  { nome: "Completar Figuras", codigo: "CF", id:"pb_CF" },
  { nome: "Cancelamento", codigo: "CA", id:"pb_CA" },
  { nome: "Informação", codigo: "IN", id:"pb_IN" },
  { nome: "Aritmética", codigo: "AR", id:"pb_AR" },
  { nome: "Raciocínio com Palavras", codigo: "RP", id:"pb_RP" },
];

const INDICES = {
  ICV: { nome: "ICV", core: ["SM","VC","CO"], supl: ["IN","RP"], n: 3 },
  IOP: { nome: "IOP", core: ["CB","CN","RM"], supl: ["CF"], n: 3 },
  IMO: { nome: "IMO", core: ["DG","SNL"], supl: ["AR"], n: 2 },
  IVP: { nome: "IVP", core: ["CD","PS"], supl: ["CA"], n: 2 },
};

const QI_CORE = ["SM","VC","CO","CB","CN","RM","DG","SNL","CD","PS"];

function calcularIdade(nascISO, aplISO) {
  if (!nascISO || !aplISO) return null;
  const n = new Date(nascISO);
  const a = new Date(aplISO);
  if (isNaN(n.getTime()) || isNaN(a.getTime()) || a < n) return null;

  let anos = a.getFullYear() - n.getFullYear();
  let meses = a.getMonth() - n.getMonth();
  if (a.getDate() < n.getDate()) meses -= 1;
  if (meses < 0) { anos -= 1; meses += 12; }
  return { anos, meses, totalMeses: anos * 12 + meses };
}

function faixaEtaria(normas, idade) {
  if (!idade) return null;
  const total = idade.totalMeses;

  for (const faixa of Object.keys(normas || {})) {
    const [ini, fim] = faixa.split("-");
    if (!ini || !fim) continue;
    const [ai, mi] = ini.split(":").map(Number);
    const [af, mf] = fim.split(":").map(Number);
    if ([ai,mi,af,mf].some(x => Number.isNaN(x))) continue;

    const min = ai * 12 + mi;
    const max = af * 12 + mf;
    if (total >= min && total <= max) return faixa;
  }
  return null;
}

function brutoParaPonderado(normas, faixa, codigo, bruto) {
  const regras = normas?.[faixa]?.subtestes?.[codigo];
  if (!Array.isArray(regras)) return null;
  const r = regras.find(x => bruto >= x.min && bruto <= x.max);
  return r ? Number(r.ponderado) : null;
}

function classificarPonderado(p) {
  if (p <= 4) return "Muito Inferior";
  if (p <= 6) return "Inferior";
  if (p <= 8) return "Médio Inferior";
  if (p <= 11) return "Médio";
  if (p <= 13) return "Médio Superior";
  if (p <= 15) return "Superior";
  return "Muito Superior";
}

function somarIndice(pondByCode, def) {
  let usados = def.core.filter(c => pondByCode[c] != null);
  if (usados.length < def.n && def.supl?.length) {
    for (const s of def.supl) {
      if (pondByCode[s] != null) { usados.push(s); break; }
    }
  }
  if (usados.length !== def.n) return { soma: null, usados };
  const soma = usados.reduce((acc, c) => acc + Number(pondByCode[c]), 0);
  return { soma, usados };
}

function somarQI(pondByCode) {
  const usados = QI_CORE.filter(c => pondByCode[c] != null);
  if (usados.length !== 10) return { soma: null, usados };
  const soma = usados.reduce((a,c)=>a+Number(pondByCode[c]),0);
  return { soma, usados };
}

function montarInputsSubtestes(){
  const tbody = document.getElementById("tbodySubtestes");
  if(!tbody) return;
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
  if(!idadeEl || !faixaEl) return;

  if(!nasc || !apl){ idadeEl.textContent=""; faixaEl.textContent=""; return; }
  const idade = calcularIdade(nasc, apl);
  if(!idade){ idadeEl.textContent="Datas inválidas."; faixaEl.textContent=""; return; }

  idadeEl.textContent = `Idade na aplicação: ${idade.anos} anos e ${idade.meses} meses.`;
  carregarNormas().then(normas=>{
    const faixa = faixaEtaria(normas, idade);
    faixaEl.textContent = faixa ? `Faixa normativa: ${faixa}` : "Faixa normativa: não encontrada.";
  }).catch(()=>{});
}

function getLaudos(){
  return JSON.parse(localStorage.getItem(LAUDOS_KEY) || "[]");
}
function setLaudos(arr){
  localStorage.setItem(LAUDOS_KEY, JSON.stringify(arr));
}

async function calcular(salvar){
  try{
    const normas = await carregarNormas();
    const nome = (document.getElementById("nome")?.value || "").trim();
    const nasc = document.getElementById("dataNascimento")?.value;
    const apl  = document.getElementById("dataAplicacao")?.value;

    if(!nome || !nasc || !apl){ alert("Preencha Nome, Nascimento e Aplicação."); return; }

    const idade = calcularIdade(nasc, apl);
    if(!idade){ alert("Datas inválidas."); return; }

    const faixa = faixaEtaria(normas, idade);
    if(!faixa){ alert("Faixa normativa não encontrada."); return; }

    const resultados = {};
    const pondByCode = {};

    for(const s of SUBTESTES){
      const v = document.getElementById(s.id)?.value;
      if(v === "" || v == null) continue;
      const bruto = Number(v);
      if(Number.isNaN(bruto) || bruto < 0){ alert(`Valor inválido em ${s.nome}`); return; }

      const pond = brutoParaPonderado(normas, faixa, s.codigo, bruto);
      if(pond == null){ alert(`PB fora da norma em ${s.nome} (${s.codigo}) para faixa ${faixa}`); return; }

      resultados[s.codigo] = {
        nome: s.nome,
        codigo: s.codigo,
        bruto,
        ponderado: pond,
        classificacao: classificarPonderado(pond)
      };
      pondByCode[s.codigo] = pond;
    }

    if(Object.keys(pondByCode).length === 0){ alert("Preencha ao menos um subteste."); return; }

    const indicesInfo = {
      ICV: somarIndice(pondByCode, INDICES.ICV),
      IOP: somarIndice(pondByCode, INDICES.IOP),
      IMO: somarIndice(pondByCode, INDICES.IMO),
      IVP: somarIndice(pondByCode, INDICES.IVP),
    };

    const qiInfo = somarQI(pondByCode);

    montarRelatorio({ nome, nasc, apl, idade, faixa, resultados, indicesInfo, qiInfo });

  }catch(e){
    console.error(e);
    alert("Erro ao calcular. Verifique normas-wisciv.json em /tests/wisciv/data/.");
  }
}

// Relatório
function montarRelatorio(data){
  const rel = document.getElementById("relatorio");
  if(!rel) return;

  const { nome, nasc, apl, idade, faixa, resultados, indicesInfo, qiInfo } = data;

  rel.style.display = "block";
  rel.innerHTML = `
    <div class="topline">
      <div style="display:flex;align-items:center;gap:12px;">
        <img class="logo" src="/logo.png" alt="Logo" onerror="this.style.display='none'">
        <div>
          <div style="font-weight:800;color:#0d47a1;font-size:16px;">Relatório – WISC-IV</div>
          <div class="muted">Gerado automaticamente</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div class="badge">Faixa: ${faixa}</div>
        <div class="muted" style="margin-top:6px;">Idade: ${idade.anos}a ${idade.meses}m</div>
      </div>
    </div>

    <div class="section">
      <div><b style="color:#0d47a1">Nome:</b> ${nome}</div>
      <div class="muted" style="margin-top:6px;">
        <b style="color:#0d47a1">Nascimento:</b> ${nasc} &nbsp;&nbsp;|&nbsp;&nbsp;
        <b style="color:#0d47a1">Aplicação:</b> ${apl}
      </div>
    </div>

    <div class="section">
      <h3>Subtestes</h3>
      <div class="canvas-wrap"><canvas id="grafSub" height="160"></canvas></div>
      <table class="table" style="margin-top:12px;">
        <thead><tr><th>Subteste</th><th>PB</th><th>Ponderado</th><th>Classificação</th></tr></thead>
        <tbody>
          ${Object.values(resultados).map(r=>`
            <tr>
              <td><b>${r.nome}</b> <span class="muted">(${r.codigo})</span></td>
              <td>${r.bruto}</td>
              <td>${r.ponderado}</td>
              <td>${r.classificacao}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>Índices e QIT (somatórios)</h3>
      <div class="canvas-wrap"><canvas id="grafIdx" height="160"></canvas></div>
      <table class="table" style="margin-top:12px;">
        <thead><tr><th>Medida</th><th>Soma (ponderados)</th><th>Subtestes usados</th></tr></thead>
        <tbody>
          ${Object.entries(INDICES).map(([k])=>{
            const info = indicesInfo[k];
            return `
              <tr>
                <td><b>${k}</b></td>
                <td>${info.soma ?? "—"}</td>
                <td>${(info.usados||[]).join(", ") || "—"}</td>
              </tr>
            `;
          }).join("")}
          <tr>
            <td><b>QIT</b></td>
            <td>${qiInfo.soma ?? "—"}</td>
            <td>${(qiInfo.usados||[]).join(", ") || "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  desenharGraficos(resultados, indicesInfo, qiInfo);
}

// Gráficos
function desenharGraficos(resultados, indicesInfo, qiInfo){
  const ctxSub = document.getElementById("grafSub");
  if(ctxSub){
    const labels = Object.values(resultados).map(r=>r.codigo);
    const vals = Object.values(resultados).map(r=>r.ponderado);

    new Chart(ctxSub, {
      type:"line",
      data:{
        labels,
        datasets:[{
          data: vals,
          showLine:false,
          pointRadius:4,
          pointHoverRadius:5,
          borderWidth:0
        }]
      },
      options:{
        plugins:{ legend:{ display:false } },
        scales:{
          y:{ min:1, max:19, ticks:{ stepSize:1 } }
        }
      }
    });
  }

  const ctxIdx = document.getElementById("grafIdx");
  if(ctxIdx){
    const labels = ["ICV","IOP","IMO","IVP","QIT"];
    const vals = [
      indicesInfo?.ICV?.soma ?? null,
      indicesInfo?.IOP?.soma ?? null,
      indicesInfo?.IMO?.soma ?? null,
      indicesInfo?.IVP?.soma ?? null,
      qiInfo?.soma ?? null,
    ];

    new Chart(ctxIdx, {
      type:"bar",
      data:{
        labels,
        datasets:[{ data: vals }]
      },
      options:{
        plugins:{ legend:{ display:false } }
      }
    });
  }
}

(function init(){
  if(document.getElementById("tbodySubtestes")){
    montarInputsSubtestes();
    document.getElementById("dataNascimento")?.addEventListener("change", atualizarPreviewIdade);
    document.getElementById("dataAplicacao")?.addEventListener("change", atualizarPreviewIdade);
  }
})();
