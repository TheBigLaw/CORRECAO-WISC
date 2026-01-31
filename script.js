/* ================= LOGIN ================= */
function login() {
  if (user.value === "admin" && pass.value === "1234") {
    localStorage.setItem("auth", "ok");
    location.href = "index.html";
  } else alert("Usuário ou senha inválidos");
}

if (!location.pathname.includes("login") && !localStorage.getItem("auth")) {
  location.href = "login.html";
}

/* =============== CONFIG ================= */
const SUBTESTES = ["CB","SM","DG","CN","CD","VC","SNL","RM","CO","PS","CF","CA","IN","AR","RP"];
let NORMAS = null;

/* ============== LOAD NORMAS ============== */
async function carregarNormas() {
  if (!NORMAS) {
    const r = await fetch("data/normas-wisciv.json");
    NORMAS = await r.json();
  }
  return NORMAS;
}

/* ============== FORM ===================== */
if (document.getElementById("subtestes")) {
  SUBTESTES.forEach(s => {
    subtestes.innerHTML += `
      <div>
        <label>${s}</label>
        <input type="number" id="${s}" min="0">
      </div>`;
  });
}

/* ============== IDADE ==================== */
function calcularIdade(nasc, apl) {
  const n = new Date(nasc);
  const a = new Date(apl);
  let anos = a.getFullYear() - n.getFullYear();
  let meses = a.getMonth() - n.getMonth();
  if (meses < 0) { anos--; meses += 12; }
  return { anos, meses };
}

function faixaEtaria({ anos, meses }) {
  const m = anos * 12 + meses;
  for (const f in NORMAS) {
    const [i,fim] = f.split("-");
    const [ai,mi] = i.split(":").map(Number);
    const [af,mf] = fim.split(":").map(Number);
    const miTot = ai*12+mi;
    const mfTot = af*12+mf;
    if (m >= miTot && m <= mfTot) return f;
  }
  return null;
}

/* ============== CLASSIFICAÇÃO ============ */
function classificar(p) {
  if (p <= 4) return "Muito Inferior";
  if (p <= 6) return "Inferior";
  if (p <= 8) return "Médio Inferior";
  if (p <= 12) return "Médio";
  if (p <= 14) return "Médio Superior";
  if (p <= 16) return "Superior";
  return "Muito Superior";
}

/* ============== CÁLCULO ================== */
async function calcularLaudo() {
  await carregarNormas();

  const idade = calcularIdade(nascimento.value, aplicacao.value);
  const faixa = faixaEtaria(idade);
  if (!faixa) return alert("Faixa etária não encontrada");

  const resultados = {};
  const valoresGrafico = {};

  SUBTESTES.forEach(s => {
    const bruto = Number(document.getElementById(s).value);
    const regras = NORMAS[faixa].subtestes[s];
    const regra = regras.find(r => bruto >= r.min && bruto <= r.max);
    const pond = regra ? regra.ponderado : null;

    resultados[s] = {
      bruto,
      ponderado: pond,
      classificacao: pond ? classificar(pond) : "—"
    };

    valoresGrafico[s] = pond;
  });

  gerarRelatorio(resultados, valoresGrafico, faixa);
}

/* ============== GRÁFICOS ================= */
function graficoSubtestes(canvasId, valores) {
  new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels: Object.keys(valores),
      datasets: [{
        data: Object.values(valores),
        borderWidth: 2,
        tension: 0.35
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { min: 1, max: 19 } }
    }
  });
}

/* ============== PDF ====================== */
function gerarRelatorio(resultados, grafico, faixa) {
  const area = document.createElement("div");
  area.id = "relatorio";
  area.innerHTML = `
    <h2>Laudo WISC-IV</h2>
    <p><b>Paciente:</b> ${nome.value}</p>
    <p><b>Faixa etária:</b> ${faixa}</p>
    <canvas id="graficoSub" height="200"></canvas>
    <h3>Resultados</h3>
    <pre>${JSON.stringify(resultados, null, 2)}</pre>
  `;

  document.body.appendChild(area);
  graficoSubtestes("graficoSub", grafico);

  setTimeout(() => {
    html2pdf().set({
      filename: `WISC-IV_${nome.value}.pdf`,
      margin: 10,
      html2canvas: { scale: 2 },
      jsPDF: { format: "a4" }
    }).from(area).save().then(() => area.remove());
  }, 500);
}
