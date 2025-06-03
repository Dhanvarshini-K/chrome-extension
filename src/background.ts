/* eslint-disable @typescript-eslint/no-explicit-any */
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CAPTURE_VISIBLE") {
    console.log(sender);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chrome.tabs.captureVisibleTab(null as any, { format: "png" }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; // Keep message channel open
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "capture") {
    chrome.windows.getCurrent((window) => {
      if (!window?.id) return;

      chrome.tabs.captureVisibleTab(window.id, { format: "png" }, (dataUrl) => {
        sendResponse({ dataUrl });
      });
    });

    return true; // Keeps the message channel open for async response
  }
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, _info, tab) => {
  if (!tab.url) return;

  await chrome.sidePanel.setOptions({
    tabId,
    path: "sidepanel.html",
    enabled: true,
  });
});





chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SAVE_CITATIONS") {
    const OID = message.OID;
    const storageKey = `citations_${OID}`;

    

    if (!OID) {
      console.error("Missing queryId");
      return;
    }

    chrome.storage.local.set({ [storageKey]: message.citations }, () => {
      if (chrome.runtime.lastError) {
        console.error("Storage error:", chrome.runtime.lastError);
      } else {
        console.log(`✅ Saved under key: ${storageKey}`);
      }
    });
  }
});

