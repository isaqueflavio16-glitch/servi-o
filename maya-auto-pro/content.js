const CREATE_URL = "https://mayasistemas.com.br/sistema/index.php?menu=occurrence_create";
const STEP_DELAY_MS = 1800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSelector(...selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function normalizeText(value) {
  return safeText(value).replace(/\s+/g, " ").toLowerCase();
}

function resolveFieldFromLabel(labelEl) {
  const htmlFor = safeText(labelEl.getAttribute("for"));
  if (htmlFor) {
    const byFor = document.getElementById(htmlFor);
    if (byFor) return byFor;
  }

  const fromNext = labelEl.nextElementSibling?.matches?.("input,select,textarea")
    ? labelEl.nextElementSibling
    : null;
  if (fromNext) return fromNext;

  return labelEl.parentElement?.querySelector?.("select,input,textarea") || null;
}

function findFieldByLabel(...aliases) {
  const wanted = aliases.map(normalizeText).filter(Boolean);
  if (!wanted.length) return null;

  const labels = [...document.querySelectorAll("label")];
  for (const labelEl of labels) {
    const labelText = normalizeText(labelEl.innerText || labelEl.textContent);
    if (!labelText) continue;

    if (wanted.some((key) => labelText.includes(key))) {
      const field = resolveFieldFromLabel(labelEl);
      if (field) return field;
    }
  }

  return null;
}

function safeText(value) {
  return value == null ? "" : String(value).trim();
}

function setProgress(total, done, message) {
  chrome.storage.local.set({
    mayaAutoProgress: { total, done, message, updatedAt: new Date().toISOString() },
  });
  console.log("[MAYA-AUTO]", `${done}/${total}`, message);
}

async function getRunState() {
  const { mayaAutoRun } = await chrome.storage.local.get(["mayaAutoRun"]);
  return mayaAutoRun || null;
}

async function updateRunState(patch) {
  const current = await getRunState();
  if (!current) return null;

  const next = { ...current, ...patch };
  await chrome.storage.local.set({ mayaAutoRun: next });
  return next;
}

function ensureCreatePage() {
  if (!window.location.href.includes("menu=occurrence_create")) {
    window.location.href = CREATE_URL;
    return false;
  }
  return true;
}

function pickOptionByLabelOrValue(selectEl, wanted) {
  const target = safeText(wanted);
  if (!target) return null;

  const normalizedTarget = normalizeText(target);
  return [...selectEl.options].find((o) => {
    const text = normalizeText(o.text);
    const value = normalizeText(o.value);
    return text === normalizedTarget || value === normalizedTarget;
  });
}

function setFieldValue(field, value, eventName = "input") {
  field.value = value;
  field.dispatchEvent(new Event(eventName, { bubbles: true }));

  if (eventName !== "change") {
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function getFormElements() {
  return {
    operatorField: normalizeSelector("#operator_id") || findFieldByLabel("operador"),
    machineField: normalizeSelector("#equipment_id") || findFieldByLabel("máquina", "maquina"),
    descriptionField:
      normalizeSelector("#description", "textarea[name='description']") ||
      findFieldByLabel("descrição", "descricao"),
    startField:
      normalizeSelector("#start-time", "input[name='start_time']", "#start_time") ||
      findFieldByLabel("hora inicial", "início", "inicio"),
    endField:
      normalizeSelector("#end-time", "input[name='end_time']", "#end_time") ||
      findFieldByLabel("hora final", "término", "termino"),
    reasonField: normalizeSelector("#reason", "#reason_id", "select[name='reason_id']"),
    stoppedField: normalizeSelector("#stopped", "#paralyzed", "select[name='paralyzed']"),
    submitButton: normalizeSelector("button[type='submit']", "input[type='submit']"),
  };
}

function validateRequiredFormElements(form) {
  const required = [
    form.operatorField,
    form.machineField,
    form.descriptionField,
    form.startField,
    form.endField,
    form.submitButton,
  ];

  if (required.some((field) => !field)) {
    throw new Error("Campos essenciais não encontrados na tela de ocorrência do Maya.");
  }
}

function fillOptionalSelect(selectField, wanted) {
  if (!selectField || !safeText(wanted)) return;

  const option = pickOptionByLabelOrValue(selectField, wanted);
  if (!option) return;

  setFieldValue(selectField, option.value, "change");
}

function fillOccurrence(occurrence, operador, maquina) {
  const form = getFormElements();
  validateRequiredFormElements(form);

  const selectedOperator = pickOptionByLabelOrValue(form.operatorField, operador);
  const selectedMachine = pickOptionByLabelOrValue(form.machineField, maquina);

  setFieldValue(form.operatorField, selectedOperator?.value || operador, "change");
  setFieldValue(form.machineField, selectedMachine?.value || maquina, "change");
  setFieldValue(form.descriptionField, safeText(occurrence.descricao) || "Ocorrência automática");
  setFieldValue(form.startField, safeText(occurrence.start) || "00:00");
  setFieldValue(form.endField, safeText(occurrence.end) || "00:00");

  fillOptionalSelect(form.reasonField, occurrence.motivo);
  fillOptionalSelect(form.stoppedField, occurrence.paralisado);

  form.submitButton.click();
}

async function markFinished(total) {
  await updateRunState({ running: false, index: total });
  setProgress(total, total, "✅ Todas as ocorrências foram cadastradas.");
}

async function markFailure(total, index, errorMessage) {
  await updateRunState({ running: false, error: errorMessage });
  setProgress(total || 0, index || 0, `❌ Erro na automação: ${errorMessage}`);
}

async function processCurrentItem(runState) {
  const total = runState.lista?.length || 0;
  const index = runState.index || 0;
  const current = runState.lista[index];

  if (!current) {
    await markFinished(total);
    return;
  }

  setProgress(total, index, `Preenchendo ocorrência ${index + 1}/${total}...`);
  fillOccurrence(current, runState.operador, runState.maquina);

  await updateRunState({ index: index + 1 });
  await sleep(STEP_DELAY_MS);

  if (index + 1 < total) {
    setProgress(total, index + 1, "Ocorrência enviada. Reabrindo formulário...");
    window.location.href = CREATE_URL;
    return;
  }

  await markFinished(total);
}

async function processQueue() {
  const runState = await getRunState();
  if (!runState?.running) return;

  const total = runState.lista?.length || 0;
  const index = runState.index || 0;

  if (!total) {
    await updateRunState({ running: false });
    setProgress(0, 0, "Nenhuma ocorrência para enviar.");
    return;
  }

  if (!ensureCreatePage()) {
    setProgress(total, index, "Abrindo tela de cadastro de ocorrência...");
    return;
  }

  try {
    await processCurrentItem(runState);
  } catch (error) {
    console.error("[MAYA-AUTO] erro", error);
    await markFailure(total, index, String(error));
  }
}

function isLegacyMessage(event) {
  return event?.data?.type === "MAYA_AUTO_PRO";
}

async function migrateLegacyMessageToRunState(event) {
  await chrome.storage.local.set({
    mayaAutoRun: {
      running: true,
      lista: event.data.lista,
      operador: event.data.operador,
      maquina: event.data.maquina,
      index: 0,
      startedAt: new Date().toISOString(),
    },
  });
}

window.addEventListener("message", async (event) => {
  if (!isLegacyMessage(event)) return;
  await migrateLegacyMessageToRunState(event);
  processQueue();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "MAYA_AUTO_RESUME") {
    processQueue();
  }
});

processQueue();
