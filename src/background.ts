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
