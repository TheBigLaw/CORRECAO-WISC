let laudoAtual = null;

/* LOGIN */
function login() {
  if (usuario.value === "admin" && senha.value === "1234") {
    sessionStorage.setItem("logado", "true");
    location.href = "index.html";
  } else {
    erro.innerText = "Usuário ou senha inválidos.";
  }
}

/* IDADE EM MESES (BASEADA NA DATA DE APLICAÇÃO) */
function idadeMeses(nasc, aplicacao) {
  const n = new Date(nasc);
  const a = new Date(aplicacao);
  let m = (a.getFullYear() - n.getFullYear()) * 12;
  m += a.getMonth() - n.getMonth();
  if (a.getDate() < n.getDate()) m--;
  return m;
}

/* FAIXAS (EXPANSÍVEL) */
const faixas = [{ nome: "6:0–6:11", min: 72, max: 83 }];

/* CLASSIFICAÇÃO */
function classificarQI(v) {
  if (v >= 130) return "Muito Superior";
  if (v >= 120) return "Superior";
  if (v >= 110) return "Média Superior";
  if (v >= 90) return "Média";
  if (v >= 80) return "Média Inferior";
  if (v >= 70) return "Limítrofe";
  return "Muito Inferior";
}

/* ÍNDICES (MODELO) */
function calcularIndices() {
  const i = { icv: 100, iop: 102, imo: 98, ivp: 95, qi: 99 };
  i.icvC = classificarQI(i.icv);
  i.iopC = classificarQI(i.iop);
  i.imoC = classificarQI(i.imo);
  i.ivpC = classificarQI(i.ivp);
  i.qiC  = classificarQI(i.qi);
  return i;
}

/* CÁLCULO PRINCIPAL */
function calcular(salvar) {
  const nome = nome.value;
  const nasc = dataNascimento.value;
  const teste = dataAplicacao.value;

  if (!nome || !nasc || !teste) {
    alert("Preencha todos os dados.");
    return;
  }

  const meses = idadeMeses(nasc, teste);
  const faixa = faixas.find(f => meses >= f.min && meses <= f.max);

  laudoAtual = calcularIndices();

  r_nome.innerText = nome;
  r_nasc.innerText = nasc;
  r_teste.innerText = teste;
  r_faixa.innerText = faixa ? faixa.nome : "Fora da norma";

  icv_valor.innerText = laudoAtual.icv;
  icv_class.innerText = laudoAtual.icvC;
  iop_valor.innerText = laudoAtual.iop;
  iop_class.innerText = laudoAtual.iopC;
  imo_valor.innerText = laudoAtual.imo;
  imo_class.innerText = laudoAtual.imoC;
  ivp_valor.innerText = laudoAtual.ivp;
  ivp_class.innerText = laudoAtual.ivpC;
  qi_valor.innerText = laudoAtual.qi;
  qi_class.innerText = laudoAtual.qiC;

  desenharGraficoSubtestes();
  desenharGraficoIndices(laudoAtual);

  if (salvar) {
    const lista = JSON.parse(localStorage.getItem("laudos")) || [];
    lista.push({ nome, teste, faixa: faixa?.nome || "-" });
    localStorage.setItem("laudos", JSON.stringify(lista));
    alert("Laudo salvo.");
  }
}
