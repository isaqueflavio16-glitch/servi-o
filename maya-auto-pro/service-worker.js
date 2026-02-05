const MAYA_BASE = "https://mayasistemas.com.br/sistema/";

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
    }

    await chrome.storage.local.set({
      mayaAutoRun: {
        running: true,
        lista: message.lista,
        operador: message.operador,
        maquina: message.maquina,
        index: 0,
        startedAt: new Date().toISOString(),
        tabId: tab.id,
      },
    });

    // Garante que o conteúdo processe assim que o tab terminar de carregar.
    await chrome.tabs.sendMessage(tab.id, { type: "MAYA_AUTO_RESUME" }).catch(() => null);

    sendResponse({ ok: true, tabId: tab.id });
  })().catch((error) => {
    sendResponse({ ok: false, error: String(error) });
  });

  return true;
});
