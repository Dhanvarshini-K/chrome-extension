/* eslint-disable @typescript-eslint/no-explicit-any */
console.log("✅ Content script loaded!");

(async () => {
  const getDataFromLocalStorage = (key: string): Promise<string | undefined> => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result.engine);
      });
    });
  };
  const engine = await getDataFromLocalStorage("engine");
  console.log("Engine value:", engine);

  let container: HTMLElement | null = null;

switch (engine) {
  case "PplxPro": {
    container = document.querySelector(".scrollable-container") as HTMLElement | null;
    break;
  }
  case "Cplt": {
    container = document.querySelector(".scrollbar-stable") as HTMLElement | null;
    break;
  }
  case "ChatGptPro": {
    const baseEl = document.querySelector('[data-testid^="conversation-turn-"]');
    container = baseEl?.parentElement?.parentElement as HTMLElement | null;
    break;
  }
  default: {
    console.warn("⚠️ Unrecognized engine, using default fallback");
    container = document.querySelector(".scrollable-container") as HTMLElement | null;
  }
}


  if (!container) {
    console.error("Container not found");
    return;
  }

  const screenshots: { dataUrl: string; startY: number; endY: number }[] = [];

  let totalHeight = container.scrollHeight;
  const viewportHeight = container.clientHeight;

  let currentScrollTop = 0;
  let iteration = 0;
  const maxIterations = 100; // just in case

  let stickyTabsRemoved = false;

  container.scrollTop = 0;
  await new Promise((r) => setTimeout(r, 500));

  // ⏱ Hold reference for restore
  let stickyClone: Element | null = null;
  let stickyParent: Node | null = null;
  let stickyNextSibling: Node | null = null;

  while (iteration++ < maxIterations) {
    const startY = container.scrollTop;

    const { dataUrl }: { dataUrl: string } = await new Promise((resolve) =>
      chrome.runtime.sendMessage({ action: "capture" }, resolve)
    );

    const endY = Math.min(startY + viewportHeight, container.scrollHeight);
    screenshots.push({ dataUrl, startY, endY });
    console.log(`✅ Captured: ${startY}px → ${endY}px`);

    // 💥 Remove .sticky-tabs-ref ONLY after first capture
    if (!stickyTabsRemoved) {
      const sticky = document.querySelector(".sticky-tabs-ref");
      if (sticky) {
        console.warn("❌ Removing .sticky-tabs-ref after first capture");

        // 🧠 Store info to restore later
        stickyClone = sticky.cloneNode(true) as HTMLElement;
        stickyParent = sticky.parentNode;
        stickyNextSibling = sticky.nextSibling;
        sticky.remove();

        // Wait for layout to stabilize after removal
        await new Promise((r) => setTimeout(r, 700));
        totalHeight = container.scrollHeight; // recalculate
        stickyTabsRemoved = true;
      }
    }

    // 💡 Scroll down
    const nextScrollTop = Math.min(startY + viewportHeight, totalHeight);
    if (nextScrollTop === currentScrollTop || endY >= totalHeight) {
      console.log("✅ Done scrolling. Exiting.");
      break;
    }

    container.scrollTop = nextScrollTop;
    currentScrollTop = nextScrollTop;
    await new Promise((r) => setTimeout(r, 700));
  }

  container.scrollTop = 0;

  // 🔁 Restore the sticky element
  if (stickyClone && stickyParent) {
    console.log("🔁 Restoring .sticky-tabs-ref to original position");
    if (stickyNextSibling) {
      stickyParent.insertBefore(stickyClone, stickyNextSibling);
    } else {
      stickyParent.appendChild(stickyClone);
    }
  }
// const scrollbarWidth = container.offsetWidth - container.clientWidth;

  chrome.runtime.sendMessage({
    action: "doneCapturing",
    screenshots,
    scrollbarWidth: 18,
  });
})();
