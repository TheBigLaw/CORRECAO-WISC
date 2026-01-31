/* ================= LOGIN ================= */
function login() {
  if (user.value === "admin" && pass.value === "1234") {
    localStorage.setItem("auth", "ok");
    location.href = "index.html";
  } else {
    alert("Usuário ou senha inválidos");
  }
}

if (!location.pathname.includes("login") && !localStorage.getItem("auth")) {
  location.href = "login.html";
}

/* ================= CONFIG ================= */
const SUBTESTES = ["CB","SM","DG","CN","CD","VC","SNL","RM","CO","PS","CF","CA","IN","AR","RP"];
let NORMAS = null;

/* ================= LOAD NORMAS ================= */
async function carregarNormas() {
  if (NORMAS) return NORMAS;

  try {
    const r = await fetch("data/normas-wisciv.json");
    if (!r.ok) throw new Error("JSON não encontrado");
    NORMAS = await r.json();
    return NORMAS;
  } catch (e) {
    alert("Erro ao carregar normas. Verifique o arquivo normas-wisciv.json");
    console.error(e);
    throw e;
  }
}

/* ================= FORM ================= */
if (document.getElementById("subtestes")) {
  SUBTESTES.forEach(s => {
    subtestes.innerHTML += `
      <div>
        <label>${s}</label>
        <input type="number" id="${s}" min="0" required>
      </div>`;
  });
}

/* ================= IDADE ================= */
function calcularIdade(nasc, apl) {
  if (!nasc || !apl) return null;

  const n = new Date(nasc);
  const a = new Date(apl);
  let anos = a.getFullYear() - n.getFullYear();
  let meses = a.getMonth() - n.getMonth();
  if (meses < 0) { anos--; meses += 12; }
  return { anos, meses };
}

function faixaEtaria(idade) {
  if (!idade) return null;
  const totalMeses = idade.anos * 12 + idade.meses;

  for (const faixa in NORMAS) {
    const [ini, fim] = faixa.split("-");
    const [ai, mi] = ini.split(":").map(Number);
    const [af, mf] = fim.split(":").map(Number);

    const min = ai * 12 + mi;
    const max = af * 12 + mf;

    if (totalMeses >= min && totalMeses <= max) return faixa;
  }
  return null;
}

/* ================= CLASSIFICAÇÃO ================= */
function classificar(p) {
  if (p <= 4) return "Muito Inferior";
  if (p <= 6) return "Inferior";
  if (p <= 8) return "Médio Inferior";
  if (p <= 12) return "Médio";
  if (p <= 14) return "Médio Superior";
  if (p <= 16) return "Superior";
  return "Muito Superior";
}

/* ================= CÁLCULO ================= */
async function calcularLaudo() {
  try {
    await carregarNormas();

    if (!nome.value || !nascimento.value || !aplicacao.value) {
      return alert("Preencha todos os dados do paciente.");
    }

    const idade = calcularIdade(nascimento.value, aplicacao.value);
    const faixa = faixaEtaria(idade);

    if (!faixa) {
      return alert("Idade fora das faixas normativas do WISC-IV.");
    }

    const resultados = {};
    const grafico = {};

    for (const s of SUBTESTES) {
      const campo = document.getElementById(s);
      if (!campo.value) {
        return alert(`Preencha o subteste ${s}.`);
      }

      const bruto = Number(campo.value);
      const regras = NORMAS[faixa]?.subtestes[s];
      if (!regras) {
        return alert(`Norma não encontrada para ${s}.`);
      }

      const regra = regras.find(r => bruto >= r.min && bruto <= r.max);
      if (!regra) {
        return alert(`Ponto bruto inválido em ${s}.`);
      }

      resultados[s] = {
        bruto,
        ponderado: regra.ponderado,
        classificacao: classificar(regra.ponderado)
      };

      grafico[s] = regra.ponderado;
    }

    gerarRelatorio(resultados, grafico, faixa);

  } catch (e) {
    console.error(e);
  }
}

/* ================= PDF + GRÁFICO ================= */
function gerarRelatorio(resultados, grafico, faixa) {
  const area = document.createElement("div");
  area.style.padding = "20px";
  area.innerHTML = `
    <h2>Laudo WISC-IV</h2>
    <p><b>Paciente:</b> ${nome.value}</p>
    <p><b>Faixa Etária:</b> ${faixa}</p>
    <canvas id="graficoSub" height="200"></canvas>
    <pre>${JSON.stringify(resultados, null, 2)}</pre>
  `;

  document.body.appendChild(area);

  new Chart(document.getElementById("graficoSub"), {
    type: "line",
    data: {
      labels: Object.keys(grafico),
      datasets: [{
        data: Object.values(grafico),
        borderWidth: 2,
        tension: 0.3
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { min: 1, max: 19 } }
    }
  });

  setTimeout(() => {
    html2pdf().set({
      filename: `WISC-IV_${nome.value}.pdf`,
      margin: 10,
      html2canvas: { scale: 2 },
      jsPDF: { format: "a4" }
    }).from(area).save().then(() => area.remove());
  }, 600);
}
