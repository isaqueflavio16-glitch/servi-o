const MAYA_BASE = "https://mayasistemas.com.br/sistema/?menu=occurrence_create";

async function findMayaTab() {
  const tabs = await chrome.tabs.query({ url: "https://mayasistemas.com.br/sistema/*" });
  return tabs[0] || null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "MAYA_AUTO_START") return;

  (async () => {
    let tab = await findMayaTab();
    if (!tab) {
      tab = await chrome.tabs.create({ url: MAYA_BASE, active: true });
    } else {
      await chrome.tabs.update(tab.id, { active: true });
      if (!tab.url?.includes("occurrence_create")) {
        tab = await chrome.tabs.update(tab.id, { url: MAYA_BASE });
      }
    }

    await chrome.storage.local.set({
      mayaAutoRun: {
        running: true,
        lista: message.lista,
        operador: message.operador,
        maquina: message.maquina,
        index: 0,
        startedAt: new Date().toISOString(),
      },
    });

    sendResponse({ ok: true });
  })().catch((error) => {
    sendResponse({ ok: false, error: String(error) });
  });

  return true;
});
