const MAYA_URL = "https://mayasistemas.com.br/sistema/";
const PROGRESS_POLL_INTERVAL_MS = 1200;

const elements = {
  operadorSelect: document.getElementById("operador"),
  maquinaSelect: document.getElementById("maquina"),
  statusEl: document.getElementById("status"),
  launchButton: document.getElementById("btnLaunch"),
  gptButton: document.getElementById("btnGPT"),
  autoButton: document.getElementById("btnCadastrar"),
  progressText: document.getElementById("progressText"),
  progressBar: document.getElementById("progressBar"),
  textoEl: document.getElementById("texto"),
  exampleButton: document.getElementById("btnExample"),
};

function setStatus(text) {
  elements.statusEl.innerText = text;
}

function setBusy(isBusy) {
  elements.gptButton.disabled = isBusy;
  elements.autoButton.disabled = isBusy;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, value));
}

function updateProgress(total = 0, done = 0, message = "Aguardando execução...") {
  elements.progressText.textContent = message;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  elements.progressBar.style.width = `${clampPercentage(pct)}%`;
}

function saveSelections() {
  chrome.storage.local.set({
    operador: elements.operadorSelect.value,
    maquina: elements.maquinaSelect.value,
  });
}

function restoreSelections() {
  chrome.storage.local.get(["operador", "maquina"], (data) => {
    if (data.operador) elements.operadorSelect.value = data.operador;
    if (data.maquina) elements.maquinaSelect.value = data.maquina;
  });
}

function clearSelectOptions() {
  elements.operadorSelect.innerHTML = "";
  elements.maquinaSelect.innerHTML = "";
}

function appendOptions(selectEl, items) {
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.innerText = item.label;
    selectEl.appendChild(opt);
  }
}

function parseListaFromTextarea() {
  const rawText = elements.textoEl.value;

  try {
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("A lista de ocorrências está vazia ou inválida.");
    }
    return parsed;
  } catch (error) {
    throw new Error(`JSON inválido: ${error.message}`);
  }
}

function ensureSelections() {
  const operador = elements.operadorSelect.value;
  const maquina = elements.maquinaSelect.value;

  if (!operador || !maquina) {
    throw new Error("Selecione operador e máquina antes de executar.");
  }

  return { operador, maquina };
}

function fillExamplePayload() {
  elements.textoEl.value = JSON.stringify(
    [
      {
        start: "07:20",
        end: "07:45",
        motivo: "Mobilização",
        paralisado: "N",
        descricao: "Entrada da equipe e liberação inicial de frente",
      },
      {
        start: "10:00",
        end: "10:20",
        motivo: "Concreto - Aguardando Entrega",
        paralisado: "S",
        descricao: "Aguardando chegada de caminhão betoneira",
      },
    ],
    null,
    2
  );
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isMayaTab(tab) {
  return Boolean(tab?.id && tab?.url?.includes("mayasistemas.com.br/sistema/"));
}

function readMayaOptionsFromTab(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          const readOptions = (selector) =>
            [...(document.querySelector(selector)?.options || [])]
              .map((o) => ({ value: o.value, label: o.text }))
              .filter((o) => o.value);

          return {
            operadores: readOptions("#operator_id"),
            maquinas: readOptions("#equipment_id"),
          };
        },
      },
      (res) => {
        resolve(res?.[0]?.result || null);
      }
    );
  });
}

async function loadData() {
  const tab = await getCurrentTab();

  if (!isMayaTab(tab)) {
    setStatus("Abra uma página do Maya para carregar operador/máquina.");
    return;
  }

  const result = await readMayaOptionsFromTab(tab.id);
  if (!result) {
    setStatus("Não foi possível ler os campos do formulário Maya.");
    return;
  }

  clearSelectOptions();
  appendOptions(elements.operadorSelect, result.operadores);
  appendOptions(elements.maquinaSelect, result.maquinas);
  restoreSelections();
  setStatus("Dados do Maya carregados.");
}

async function refreshProgress() {
  const { mayaAutoRun, mayaAutoProgress } = await chrome.storage.local.get([
    "mayaAutoRun",
    "mayaAutoProgress",
  ]);

  if (mayaAutoProgress?.total) {
    updateProgress(
      mayaAutoProgress.total,
      mayaAutoProgress.done,
      mayaAutoProgress.message || "Executando automação..."
    );
  }

  if (mayaAutoRun?.running) {
    setStatus("🤖 Automação em andamento no Maya...");
  }
}

async function openMaya() {
  await chrome.tabs.create({ url: MAYA_URL });
}

async function handleGPT() {
  saveSelections();
  setBusy(true);
  setStatus("🧠 GPT estruturando relatório...");

  try {
    const texto = elements.textoEl.value.trim();
    if (!texto) throw new Error("Informe o texto do relatório.");

    const lista = await analisarComGPT(texto);
    elements.textoEl.value = JSON.stringify(lista, null, 2);
    setStatus("✅ GPT estruturou as ocorrências.");
  } catch (error) {
    setStatus(`❌ ${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function startAutomation(payload) {
  return chrome.runtime.sendMessage({ type: "MAYA_AUTO_START", ...payload });
}

async function handleAutomation() {
  saveSelections();
  setBusy(true);

  try {
    const { operador, maquina } = ensureSelections();
    const lista = parseListaFromTextarea();

    setStatus("⏳ Iniciando automação autônoma...");

    const response = await startAutomation({ lista, operador, maquina });

    if (!response?.ok) {
      throw new Error(response?.error || "Falha ao iniciar automação.");
    }

    setStatus("🚀 Automação iniciada. Acompanhe o progresso.");
    updateProgress(lista.length, 0, "Preparando execução no Maya...");
  } catch (error) {
    setStatus(`❌ ${error.message}`);
  } finally {
    setBusy(false);
  }
}

function setupEvents() {
  elements.launchButton.addEventListener("click", openMaya);
  elements.exampleButton.addEventListener("click", fillExamplePayload);
  elements.gptButton.addEventListener("click", handleGPT);
  elements.autoButton.addEventListener("click", handleAutomation);
}

function bootstrap() {
  setupEvents();
  loadData();
  refreshProgress();
  setInterval(refreshProgress, PROGRESS_POLL_INTERVAL_MS);
}

bootstrap();
