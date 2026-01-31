/* LOGIN */
function login() {
  const u = usuario.value;
  const s = senha.value;
  if (u === "admin" && s === "1234") {
    sessionStorage.setItem("logado", "true");
    location.href = "index.html";
  } else {
    erro.innerText = "Usuário ou senha inválidos.";
  }
}

/* IDADE EM MESES */
function idadeMeses(data) {
  const hoje = new Date();
  const nasc = new Date(data);
  let m = (hoje.getFullYear() - nasc.getFullYear()) * 12;
  m += hoje.getMonth() - nasc.getMonth();
  if (hoje.getDate() < nasc.getDate()) m--;
  return m;
}

/* FAIXA (EXPANSÍVEL) */
const faixas = [{ nome: "6:0–6:11", min: 72, max: 83 }];

/* CÁLCULO */
function calcular(salvar) {
  const nome = document.getElementById("nome").value;
  const nasc = dataNascimento.value;
  const teste = dataAplicacao.value;

  if (!nome || !nasc || !teste) {
    alert("Preencha todos os dados de identificação.");
    return;
  }

  const meses = idadeMeses(nasc);
  const faixa = faixas.find(f => meses >= f.min && meses <= f.max);

  r_nome.innerText = nome;
  r_nasc.innerText = nasc;
  r_teste.innerText = teste;
  r_faixa.innerText = faixa ? faixa.nome : "Fora da norma";

  desenharGraficoSubtestes();

  if (salvar) {
    const lista = JSON.parse(localStorage.getItem("laudos")) || [];
    lista.push({ nome, teste, faixa: faixa ? faixa.nome : "-" });
    localStorage.setItem("laudos", JSON.stringify(lista));
    alert("Laudo salvo com sucesso.");
  }
}

/* GRÁFICO DE LINHA */
function desenharGraficoSubtestes() {
  const valores = [
    cubos.value, semelhancas.value, digitos.value, conceitos.value,
    codigo.value, vocabulario.value, sequencia.value,
    matricial.value, compreensao.value, simbolos.value
  ].map(Number);

  const canvas = document.getElementById("graficoSubtestes");
  const ctx = canvas.getContext("2d");
  const pad = 40;
  const max = 19;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.beginPath();
  valores.forEach((v,i)=>{
    const x = pad + i*(canvas.width-2*pad)/(valores.length-1);
    const y = canvas.height-pad-(v/max)*(canvas.height-2*pad);
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.strokeStyle="#1f4fa3";
  ctx.lineWidth=2;
  ctx.stroke();
}

/* LISTAGEM */
function carregarLaudos() {
  const lista = JSON.parse(localStorage.getItem("laudos")) || [];
  const t = document.getElementById("tabelaLaudos");
  lista.forEach(l=>{
    const r=t.insertRow();
    r.innerHTML=`<td>${l.nome}</td><td>${l.teste}</td><td>${l.faixa}</td>`;
  });
}

function desenharGraficoIndices(indices) {
  const canvas = document.getElementById("graficoIndices");
  const ctx = canvas.getContext("2d");

  const labels = ["ICV", "IOP", "IMO", "IVP", "QI"];
  const valores = [
    indices.icv,
    indices.iop,
    indices.imo,
    indices.ivp,
    indices.qi
  ];

  const pad = 40;
  const max = 160;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  valores.forEach((v, i) => {
    const x = pad + i * (canvas.width - 2 * pad) / (valores.length - 1);
    const y = canvas.height - pad - (v / max) * (canvas.height - 2 * pad);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#1f4fa3";
  ctx.lineWidth = 2;
  ctx.stroke();
}
