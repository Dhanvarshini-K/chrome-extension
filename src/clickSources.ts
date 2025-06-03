(() => {
  const interval = setInterval(() => {
    const sourcesTab = document.querySelector('[data-testid="answer-mode-tabs-tab-sources"]');
    if (sourcesTab instanceof HTMLElement) {
      sourcesTab.click();
      console.log("✅ Sources tab clicked");
      clearInterval(interval);
    } else {
      console.log("⌛ Waiting for sources tab...");
    }
  }, 500); // check every 500ms

  // Optional: stop trying after 10 seconds
  setTimeout(() => clearInterval(interval), 10000);
})();
