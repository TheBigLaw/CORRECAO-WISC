// LOGIN
function login() {
  if (user.value === "admin" && pass.value === "1234") {
    localStorage.setItem("auth", "ok");
    location.href = "index.html";
  } else alert("Credenciais inválidas");
}

if (location.pathname !== "/login.html" && !localStorage.getItem("auth")) {
  location.href = "login.html";
}

// SUBTESTES NA ORDEM OFICIAL
const SUBTESTES = ["CB","SM","DG","CN","CD","VC","SNL","RM","CO","PS","CF","CA","IN","AR","RP"];

// CRIA CAMPOS
if (document.getElementById("subtestes")) {
  SUBTESTES.forEach(s => {
    subtestes.innerHTML += `
      <div>
        <label>${s}</label>
        <input type="number" id="${s}">
      </div>`;
  });
}

// IDADE
function calcularIdade(nasc, apl) {
  const n = new Date(nasc), a = new Date(apl);
  let anos = a.getFullYear() - n.getFullYear();
  let meses = a.getMonth() - n.getMonth();
  if (meses < 0) { anos--; meses += 12; }
  return { anos, meses };
}

// CLASSIFICAÇÃO
function classificar(p) {
  if (p <= 4) return "Muito Inferior";
  if (p <= 6) return "Inferior";
  if (p <= 8) return "Médio Inferior";
  if (p <= 12) return "Médio";
  if (p <= 14) return "Médio Superior";
  if (p <= 16) return "Superior";
  return "Muito Superior";
}

// CARREGA NORMAS (externo)
async function carregarNormas() {
  const r = await fetch("normas-wisciv.json");
  return r.json();
}

async function calcularLaudo() {
  const normas = await carregarNormas();
  const idade = calcularIdade(nascimento.value, aplicacao.value);
  const faixa = `${idade.anos}:${idade.meses}`;

  let resultados = {};

  SUBTESTES.forEach(s => {
    const bruto = parseInt(document.getElementById(s).value);
    const regra = normas[faixa][s].find(r => bruto >= r.min && bruto <= r.max);
    resultados[s] = {
      bruto,
      ponderado: regra.valor,
      classificacao: classificar(regra.valor)
    };
  });

  gerarPDF(resultados);
}

function gerarPDF(dados) {
  const div = document.createElement("div");
  div.innerHTML = `<h2>Laudo WISC-IV</h2><pre>${JSON.stringify(dados,null,2)}</pre>`;
  html2pdf().from(div).save("laudo-wisciv.pdf");
}
