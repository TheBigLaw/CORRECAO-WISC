/* ===========================
   FAIXAS ETÁRIAS (EXEMPLO)
=========================== */

const normasWISC = [
  { faixa: "6:0-6:11", minMeses: 72, maxMeses: 83, normas: gerarNormasMock() },
  { faixa: "7:0-7:11", minMeses: 84, maxMeses: 95, normas: gerarNormasMock() }
];

/* ===========================
   FUNÇÕES AUXILIARES
=========================== */

function gerarNormasMock() {
  return {
    Semelhancas: bruto => limitar(bruto),
    Vocabulario: bruto => limitar(bruto),
    Compreensao: bruto => limitar(bruto),
    Cubos: bruto => limitar(bruto),
    Conceitos: bruto => limitar(bruto),
    Matricial: bruto => limitar(bruto),
    Digitos: bruto => limitar(bruto),
    Sequencia: bruto => limitar(bruto),
    Codigo: bruto => limitar(bruto),
    Simbolos: bruto => limitar(bruto),
    indice: soma => Math.round(40 + soma * 2)
  };
}

function limitar(valor) {
  if (isNaN(valor)) return 0;
  return Math.min(19, Math.max(1, valor));
}

function classificar(score) {
  if (score >= 130) return "Muito Superior";
  if (score >= 120) return "Superior";
  if (score >= 90) return "Médio";
  if (score >= 80) return "Médio Inferior";
  return "Inferior";
}

/* ===========================
   CÁLCULO DA IDADE
=========================== */

function calcularIdadeEmMeses(dataNascimento) {
  const hoje = new Date();
  const nasc = new Date(dataNascimento);

  let meses = (hoje.getFullYear() - nasc.getFullYear()) * 12;
  meses += hoje.getMonth() - nasc.getMonth();

  if (hoje.getDate() < nasc.getDate()) {
    meses--;
  }

  return meses;
}

function obterFaixaEtaria() {
  const dataNascimento = document.getElementById("dataNascimento").value;
  if (!dataNascimento) return null;

  const idadeMeses = calcularIdadeEmMeses(dataNascimento);

  const anos = Math.floor(idadeMeses / 12);
  const meses = idadeMeses % 12;

  document.getElementById("idadeCalculada").innerText =
    `Idade calculada: ${anos} anos e ${meses} meses`;

  return normasWISC.find(f =>
    idadeMeses >= f.minMeses && idadeMeses <= f.maxMeses
  );
}

/* ===========================
   CÁLCULO PRINCIPAL
=========================== */

function calcular() {
  const faixa = obterFaixaEtaria();

  if (!faixa) {
    alert("Data de nascimento inválida ou fora das faixas cadastradas.");
    return;
  }

  const grupos = {
    CV: ["Semelhancas","Vocabulario","Compreensao"],
    RP: ["Cubos","Conceitos","Matricial"],
    MT: ["Digitos","Sequencia"],
    VP: ["Codigo","Simbolos"]
  };

  let resultados = {};
  let somaQI = 0;

  for (let grupo in grupos) {
    let soma = 0;
    grupos[grupo].forEach(teste => {
      const bruto = parseInt(document.getElementById(teste).value || 0);
      soma += faixa.normas[teste](bruto);
    });

    const indice = faixa.normas.indice(soma);
    resultados[grupo] = indice;
    somaQI += indice;
  }

  const QIT = Math.round(somaQI / 4);

  document.getElementById("resultado").innerHTML = `
    <h2>Resultados (${faixa.faixa})</h2>
    <table>
      <tr><th>Índice</th><th>Pontuação</th><th>Classificação</th></tr>
      <tr><td>Compreensão Verbal</td><td>${resultados.CV}</td><td>${classificar(resultados.CV)}</td></tr>
      <tr><td>Raciocínio Perceptual</td><td>${resultados.RP}</td><td>${classificar(resultados.RP)}</td></tr>
      <tr><td>Memória de Trabalho</td><td>${resultados.MT}</td><td>${classificar(resultados.MT)}</td></tr>
      <tr><td>Velocidade de Processamento</td><td>${resultados.VP}</td><td>${classificar(resultados.VP)}</td></tr>
      <tr><th>QI Total</th><th>${QIT}</th><th>${classificar(QIT)}</th></tr>
    </table>
  `;
}
