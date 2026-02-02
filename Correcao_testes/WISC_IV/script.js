// tests/wisciv/script.js

const LAUDOS_KEY = "empresa_laudos_wisciv_v1";

let NORMAS = null;
async function carregarNormas(){
  if(NORMAS) return NORMAS;

  // Mantém relativo à página atual (novo-laudo.html está em /Correcao_testes/WISC_IV/)
  // então "data/..." resolve para /Correcao_testes/WISC_IV/data/...
  const url = "data/normas-wisciv.json";
  const resp = await fetch(url, { cache:"no-store" });

  if(!resp.ok) throw new Error(`Falha ao carregar: ${url} (HTTP ${resp.status})`);

  const json = await resp.json();
  if (!json || typeof json !== "object" || Object.keys(json).length === 0) {
    throw new Error("Normas carregadas, mas o JSON veio vazio ou inválido.");
  }

  NORMAS = json;
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

function obterNomeSubteste(codigo){
  const map = {
    CB:"Cubos", SM:"Semelhanças", DG:"Dígitos", CN:"Conceitos Figurativos", CD:"Código",
    VC:"Vocabulário", SNL:"Seq. Núm. e Letras", RM:"Raciocínio Matricial", CO:"Compreensão",
    PS:"Procurar Símbolos", CF:"Completar Figuras", CA:"Cancelamento", IN:"Informação",
    AR:"Aritmética", RP:"Raciocínio com Palavras"
  };
  return map[codigo] || codigo;
}

function cellIndice(codigo, setUsado, setPossivel, resultados) {
  if (!setPossivel.has(codigo)) return `<td class="idx"></td>`;
  if (!setUsado.has(codigo)) return `<td class="idx fill empty"></td>`;
  const r = resultados[codigo];
  if (!r) return `<td class="idx fill"></td>`;
  const suplementar = ["CF","CA","IN","AR","RP"].includes(codigo);
  const cls = suplementar ? "pill sup" : "pill";
  return `<td class="idx fill"><span class="${cls}">${r.ponderado}</span></td>`;
}

function renderMatrizConversao({ resultados, indicesInfo, qiInfo }) {
  const usadosICV = new Set(indicesInfo?.ICV?.usados || []);
  const usadosIOP = new Set(indicesInfo?.IOP?.usados || []);
  const usadosIMO = new Set(indicesInfo?.IMO?.usados || []);
  const usadosIVP = new Set(indicesInfo?.IVP?.usados || []);
  const usadosQI  = new Set(qiInfo?.usados || []);

  const possiveis = {
    ICV: new Set(["SM","VC","CO","IN","RP"]),
    IOP: new Set(["CB","CN","RM","CF"]),
    IMO: new Set(["DG","SNL","AR"]),
    IVP: new Set(["CD","PS","CA"]),
  };

  const ordem = ["CB","SM","DG","CN","CD","VC","SNL","RM","CO","PS","CF","CA","IN","AR","RP"];

  const linhas = ordem.map(codigo => {
    const r = resultados[codigo] || { bruto: "", ponderado: "" };
    const nome = obterNomeSubteste(codigo);

    const qitCell =
      usadosQI.has(codigo) && resultados[codigo]
        ? `<td class="idx fill"><span class="pill">${resultados[codigo].ponderado}</span></td>`
        : usadosQI.has(codigo)
          ? `<td class="idx fill empty"></td>`
          : `<td class="idx"></td>`;

    return `
      <tr>
        <td class="col-sub"><b>${nome}</b> <span class="muted">(${codigo})</span></td>
        <td class="col-pb">${r.bruto ?? ""}</td>
        <td class="col-pp">${r.ponderado ?? ""}</td>
        ${cellIndice(codigo, usadosICV, possiveis.ICV, resultados)}
        ${cellIndice(codigo, usadosIOP, possiveis.IOP, resultados)}
        ${cellIndice(codigo, usadosIMO, possiveis.IMO, resultados)}
        ${cellIndice(codigo, usadosIVP, possiveis.IVP, resultados)}
        ${qitCell}
      </tr>
    `;
  }).join("");

  return `
    <table class="wisc-matrix">
      <thead>
        <tr>
          <th class="col-sub">Subtestes</th>
          <th class="col-pb">PB</th>
          <th class="col-pp">Ponderado</th>
          <th colspan="5">Contribuição (Pontos Ponderados)</th>
        </tr>
        <tr>
          <th></th><th></th><th></th>
          <th class="idx">ICV</th>
          <th class="idx">IOP</th>
          <th class="idx">IMO</th>
          <th class="idx">IVP</th>
          <th class="idx">QIT</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
      <tfoot>
        <tr>
          <td class="sum-label" colspan="3">Soma dos Pontos Ponderados</td>
          <td>${indicesInfo?.ICV?.soma ?? "—"}</td>
          <td>${indicesInfo?.IOP?.soma ?? "—"}</td>
          <td>${indicesInfo?.IMO?.soma ?? "—"}</td>
          <td>${indicesInfo?.IVP?.soma ?? "—"}</td>
          <td>${qiInfo?.soma ?? "—"}</td>
        </tr>
      </tfoot>
    </table>
  `;
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

// ----------------------
// RELATÓRIO / GRÁFICOS
// ----------------------

let chartPerfil = null;

// ordem do perfil (igual ao modelo com grupos + suplementares entre parênteses)
const PERFIL_ORDEM = ["SM","VC","CO","IN","RP","CB","CN","RM","CF","DG","SNL","AR","CD","PS","CA"];

function montarRelatorio(data){
  const rel = document.getElementById("relatorio");
  if(!rel) return;

  const { nome, nasc, apl, idade, faixa, resultados, indicesInfo, qiInfo } = data;
  const matriz = renderMatrizConversao({ resultados, indicesInfo, qiInfo });

  // Cabeçalho do perfil (códigos + valores)
  const headerPerfil = PERFIL_ORDEM.map(c=>{
    const val = resultados?.[c]?.ponderado ?? "—";
    const sup = ["IN","RP","CF","AR","CA"].includes(c);
    return `<div class="perfil-cell">
      <div class="perfil-code">${sup ? `(${c})` : c}</div>
      <div class="perfil-val">${val}</div>
    </div>`;
  }).join("");

  rel.style.display = "block";
  rel.innerHTML = `
    <div class="report-wrap">
      <div class="report-header">
        <div class="report-brand">
          <img class="report-logo" src="logo2.png" alt="Logo" onerror="this.style.display='none'">
          <div>
            <div class="report-title">Relatório – WISC-IV</div>
            <div class="report-subtitle">Conversão PB → Ponderado e somatórios por índice</div>
          </div>
        </div>
        <div class="report-meta">
          <div><b>Faixa:</b> ${faixa}</div>
          <div><b>Idade:</b> ${idade.anos}a ${idade.meses}m</div>
        </div>
      </div>

      <div class="report-card">
        <div><b>Nome:</b> ${nome}</div>
        <div><b>Nascimento:</b> ${nasc}</div>
        <div><b>Aplicação:</b> ${apl}</div>
      </div>

      <div class="report-card">
        <h3 class="report-h3">Perfil dos Pontos Ponderados dos Subtestes</h3>

        <div class="perfil-groups">
          <div class="g g1">Compreensão<br>Verbal</div>
          <div class="g g2">Organização<br>Perceptual</div>
          <div class="g g3">Memória<br>Operacional</div>
          <div class="g g4">Velocidade de<br>Proc.</div>
        </div>

        <div class="perfil-head">
          ${headerPerfil}
        </div>

        <div class="perfil-chart">
          <canvas id="grafPerfil" height="260"></canvas>
        </div>

        <div class="muted" style="margin-top:10px;">
          A faixa azul indica a região média aproximada (9–11) dos pontos ponderados.
        </div>
      </div>

      <div class="report-card page-break">
        <h3 class="report-h3">Conversão PB → Ponderado e contribuição nos Índices</h3>
        <div class="matrix-card">${matriz}</div>

        <div class="muted" style="margin-top:10px;">
          Células azuis indicam subtestes usados na soma do índice/QIT. Suplementares podem aparecer entre parênteses.
        </div>
      </div>

      <div class="report-card page-break">
        <h3 class="report-h3">Subtestes (detalhamento)</h3>
        <table class="table report-table">
          <thead>
            <tr>
              <th>Subteste</th>
              <th>PB</th>
              <th>Ponderado</th>
              <th>Classificação</th>
            </tr>
          </thead>
          <tbody>
            ${["CB","SM","DG","CN","CD","VC","SNL","RM","CO","PS","CF","CA","IN","AR","RP"].map(c=>{
              const r = resultados?.[c];
              if(!r) return "";
              return `
                <tr>
                  <td><b>${r.nome}</b> <span class="muted">(${r.codigo})</span></td>
                  <td>${r.bruto}</td>
                  <td>${r.ponderado}</td>
                  <td>${r.classificacao}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="report-card">
        <h3 class="report-h3">Somatórios (pontos ponderados)</h3>
        <table class="table report-table">
          <thead>
            <tr>
              <th>Medida</th>
              <th>Soma</th>
              <th>Subtestes usados</th>
            </tr>
          </thead>
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

      <div class="report-footer">
        <img class="report-logo-footer" src="logo2.png" alt="Logo" onerror="this.style.display='none'">
      </div>
    </div>
  `;

  desenharGraficoPerfil(resultados);
}

function desenharGraficoPerfil(resultados){
  const canvas = document.getElementById("grafPerfil");
  if(!canvas) return;

  if(chartPerfil) chartPerfil.destroy();

  // pontos (x = posição), com null para ausentes
  const dataPts = PERFIL_ORDEM.map((code, i) => {
    const v = resultados?.[code]?.ponderado;
    if(v == null) return { x: i+1, y: null };
    return { x: i+1, y: Number(v) };
  });

  // plugin: faixa 9-11 + separadores de grupos
  const pluginPerfil = {
    id: "perfilDecor",
    beforeDatasetsDraw(chart){
      const { ctx, chartArea, scales } = chart;
      if(!chartArea) return;

      const y = scales.y;
      const x = scales.x;

      // faixa média 9–11
      const yTop = y.getPixelForValue(11);
      const yBot = y.getPixelForValue(9);

      ctx.save();
      ctx.fillStyle = "rgba(13,71,161,0.12)";
      ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, yBot - yTop);
      ctx.restore();

      // separadores (após RP, após CF, após AR)
      const cuts = [
        { after: 5, label:"" },  // SM VC CO IN RP (5)
        { after: 9, label:"" },  // CB CN RM CF (4) -> total 9
        { after: 12, label:"" }, // DG SNL AR (3) -> total 12
      ];

      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;

      cuts.forEach(c=>{
        const px = x.getPixelForValue(c.after + 0.5);
        ctx.beginPath();
        ctx.moveTo(px, chartArea.top);
        ctx.lineTo(px, chartArea.bottom);
        ctx.stroke();
      });

      ctx.restore();
    }
  };

  chartPerfil = new Chart(canvas, {
    type: "line",
    data: {
      datasets: [{
        data: dataPts,
        showLine: false,
        pointRadius: 5,
        pointHoverRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display:false },
        tooltip: {
          callbacks: {
            label: (ctx)=>{
              const idx = ctx.dataIndex;
              const code = PERFIL_ORDEM[idx];
              const nome = obterNomeSubteste(code);
              const val = ctx.parsed.y;
              return `${code} (${nome}): ${val}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          min: 0.5,
          max: PERFIL_ORDEM.length + 0.5,
          ticks: { display:false },
          grid: { display:false }
        },
        y: {
          min: 1,
          max: 19,
          ticks: { stepSize: 1 },
          grid: { color: "rgba(0,0,0,0.10)" }
        }
      }
    },
    plugins: [pluginPerfil]
  });

  chartPerfil.update();
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function esperarGraficos(){
  // tempo curto para garantir que o canvas foi desenhado antes do html2pdf capturar
  await sleep(250);
  if(chartPerfil) chartPerfil.update();
  await sleep(100);
}

// ----------------------
// CÁLCULO (sem mexer na lógica)
// apenas garante relatório + PDF completos
// ----------------------
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

    // monta relatório (corrigido)
    montarRelatorio({ nome, nasc, apl, idade, faixa, resultados, indicesInfo, qiInfo });

    if(salvar){
      // garante que o gráfico foi desenhado antes do PDF
      await esperarGraficos();

      const rel = document.getElementById("relatorio");
      await html2pdf().set({
        margin: 10,
        filename: `WISC-IV_${nome}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { format: "a4" },
        pagebreak: { mode: ["css", "legacy"] }
      }).from(rel).save();

      const laudos = getLaudos();
      laudos.unshift({
        nome,
        dataAplicacao: apl,
        faixa,
        createdAt: new Date().toISOString(),
        htmlRelatorio: rel.outerHTML
      });
      setLaudos(laudos);

      alert("Laudo salvo e PDF gerado.");
    }

  }catch(e){
    console.error(e);
    alert("Erro ao calcular. Verifique normas-wisciv.json em /Correcao_testes/WISC_IV/data/.");
  }
}

function renderListaLaudos(){
  const box = document.getElementById("listaLaudos");
  if(!box) return;

  const laudos = getLaudos();
  if(!laudos.length){
    box.innerHTML = `<p class="muted">Nenhum laudo salvo ainda.</p>`;
    return;
  }

  box.innerHTML = `
    <table class="table">
      <thead><tr><th>Paciente</th><th>Aplicação</th><th>Faixa</th><th>Ações</th></tr></thead>
      <tbody>
        ${laudos.map((x, idx)=>`
          <tr>
            <td>${x.nome}</td>
            <td>${x.dataAplicacao}</td>
            <td><span class="badge">${x.faixa}</span></td>
            <td><button class="btn-outline" onclick="baixarPDFSalvo(${idx})">Baixar PDF</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function baixarPDFSalvo(index){
  const laudos = getLaudos();
  const item = laudos[index];
  if(!item) return alert("Laudo não encontrado.");

  const temp = document.createElement("div");
  temp.innerHTML = item.htmlRelatorio;
  document.body.appendChild(temp);

  html2pdf().set({
    margin: 10,
    filename: `WISC-IV_${item.nome}.pdf`,
    html2canvas: { scale: 2, useCORS:true },
    jsPDF: { format: "a4" },
    pagebreak: { mode: ["css", "legacy"] }
  }).from(temp).save().then(()=>temp.remove());
}

(function init(){
  // novo-laudo
  if(document.getElementById("tbodySubtestes")){
    montarInputsSubtestes();
    document.getElementById("dataNascimento")?.addEventListener("change", atualizarPreviewIdade);
    document.getElementById("dataAplicacao")?.addEventListener("change", atualizarPreviewIdade);
  }

  // laudos
  if(document.getElementById("listaLaudos")){
    renderListaLaudos();
  }
})();
