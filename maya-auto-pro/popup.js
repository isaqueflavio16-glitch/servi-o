const operadorSelect = document.getElementById("operador");
const maquinaSelect = document.getElementById("maquina");
const status = document.getElementById("status");
const apiKeyInput = document.getElementById("apikey");
const launchButton = document.getElementById("btnLaunch");

// ✅ carregar dados do site Maya
async function carregarDados() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {

      const operadores = [...document.querySelector("#operator_id").options]
        .map(o => ({ value: o.value, label: o.text }))
        .filter(o => o.value);

      const maquinas = [...document.querySelector("#equipment_id").options]
        .map(o => ({ value: o.value, label: o.text }))
        .filter(o => o.value);

      return { operadores, maquinas };
    }

  }, (res) => {

    const { operadores, maquinas } = res[0].result;

    operadores.forEach(op => {
      let opt = document.createElement("option");
      opt.value = op.value;
      opt.innerText = op.label;
      operadorSelect.appendChild(opt);
    });

    maquinas.forEach(m => {
      let opt = document.createElement("option");
      opt.value = m.value;
      opt.innerText = m.label;
      maquinaSelect.appendChild(opt);
    });

    // ✅ carregar preferências
    chrome.storage.local.get(["operador", "maquina", "apikey"], (data) => {
      if (data.operador) operadorSelect.value = data.operador;
      if (data.maquina) maquinaSelect.value = data.maquina;
      if (data.apikey) apiKeyInput.value = data.apikey;
    });

  });
}

carregarDados();

launchButton.addEventListener("click", async () => {
  await chrome.tabs.create({ url: "https://mayasistemas.com.br/sistema/" });
});

// ✅ salvar preferências
function salvar() {
  chrome.storage.local.set({
    operador: operadorSelect.value,
    maquina: maquinaSelect.value,
    apikey: apiKeyInput.value
  });
}

// ✅ Botão GPT
document.getElementById("btnGPT").addEventListener("click", async () => {

  salvar();
  status.innerText = "🧠 GPT pensando...";

  const texto = document.getElementById("texto").value;
  const apiKey = apiKeyInput.value;

  const lista = await analisarComGPT(texto, apiKey);

  document.getElementById("texto").value =
    JSON.stringify(lista, null, 2);

  status.innerText = "✅ GPT estruturou tudo!";
});

// ✅ Botão cadastrar automático
document.getElementById("btnCadastrar").addEventListener("click", async () => {

  salvar();
  status.innerText = "⏳ Enviando para Maya...";

  const textoJSON = document.getElementById("texto").value;

  let lista = JSON.parse(textoJSON);

  const operador = operadorSelect.value;
  const maquina = maquinaSelect.value;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (lista, operador, maquina) => {
      window.postMessage({
        type: "MAYA_AUTO_PRO",
        lista,
        operador,
        maquina
      }, "*");
    },
    args: [lista, operador, maquina]
  });

});
