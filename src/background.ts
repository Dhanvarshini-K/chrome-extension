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
