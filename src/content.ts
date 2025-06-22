/* eslint-disable @typescript-eslint/no-explicit-any */
console.log("✅ Content script loaded!");

// window.addEventListener("load", () => {
//   const el = document.querySelector('[id^="markdown-content"]');

//   if (el) {
//     const html = el.innerHTML;
//     const text = el.textContent || "";

//     chrome.runtime.sendMessage({
//       type: "EXTRACTED_HTML",
//       html,
//       text,
//     });
//   } else {
//     console.warn(
//       "❌ No element with id starting with 'markdown-content' found."
//     );
//   }
// });

// (async () => {
//   const scrollHeight = 2500;
//   const viewportHeight = window.innerHeight;
//   const totalSteps = Math.ceil(scrollHeight / viewportHeight);
//   const canvas = document.createElement("canvas");
//   canvas.width = window.innerWidth;
//   canvas.height = scrollHeight;
//   const context = canvas.getContext("2d");

//   console.log("Total steps:", totalSteps);
//   console.log("Viewport height:", scrollHeight);

//   for (let step = 1; step < totalSteps; step++) {
//     console.log("Capturing step:", step);
//     window.scrollTo(0, step * viewportHeight);
//     await new Promise((res) => setTimeout(res, 300)); // wait for scroll render

//     const dataUrl: string = await new Promise((resolve) => {
//       chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE" }, (response) => {
//         resolve(response?.dataUrl);
//       });
//     });

//     const img = new Image();
//     img.src = dataUrl;
//     await new Promise((res) => {
//       img.onload = res;
//     });

//     context?.drawImage(img, 0, step * viewportHeight);
//   }

//   window.scrollTo(0, 0); // Reset scroll

//   const finalImage = canvas.toDataURL("image/png");
//   const link = document.createElement("a");
//   link.href = finalImage;
//   link.download = "full_page_screenshot.png";
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);

//   console.log("Final image data URL:", finalImage);

//   // Send result back to popup or extension
//   chrome.runtime.sendMessage({
//     type: "FULL_SCREENSHOT_READY",
//     dataUrl: finalImage,
//   });
// })();

// (async () => {
//   // 👉 Get the scrollable div
//   const scrollableDiv = document.querySelector(
//     "div.erp-sidecar"
//   ) as HTMLElement;

//   if (!scrollableDiv) {
//     console.error("Scrollable div not found");
//     return;
//   }

//   const scrollHeight = scrollableDiv.scrollHeight;
//   const viewportHeight = scrollableDiv.clientHeight;
//   const totalSteps = Math.ceil(scrollHeight / viewportHeight);

//   console.log("Total steps:", totalSteps);
//   console.log("Viewport height:", viewportHeight);
//   console.log("Total scroll height:", scrollHeight);

//   const canvas = document.createElement("canvas");
//   canvas.width = scrollableDiv.clientWidth;
//   canvas.height = scrollHeight;
//   const context = canvas.getContext("2d");

//   for (let step = 0; step < totalSteps; step++) {
//     scrollableDiv.scrollTo({ top: step * viewportHeight, behavior: "instant" });

//     await new Promise((res) => setTimeout(res, 300)); // Wait for render

//     const dataUrl: string = await new Promise((resolve) => {
//       chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE" }, (response) => {
//         resolve(response?.dataUrl);
//       });
//     });

//     const img = new Image();
//     img.src = dataUrl;
//     await new Promise((res) => {
//       img.onload = res;
//     });

//     const yOffset = step * viewportHeight;
//     context?.drawImage(
//       img,
//       scrollableDiv.getBoundingClientRect().left,
//       scrollableDiv.getBoundingClientRect().top,
//       scrollableDiv.clientWidth,
//       viewportHeight,
//       0,
//       yOffset,
//       scrollableDiv.clientWidth,
//       viewportHeight
//     );
//   }

//   scrollableDiv.scrollTo({ top: 0 });

//   const finalImage = canvas.toDataURL("image/png");

//   // Optional: trigger download
//   const link = document.createElement("a");
//   link.href = finalImage;
//   link.download = "scrollable_div_screenshot.png";
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);

//   // Send result back to popup or background
//   chrome.runtime.sendMessage({
//     type: "FULL_SCREENSHOT_READY",
//     dataUrl: finalImage,
//   });
// })();

// Load html2canvas if needed

// (async () => {
//   const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
//   const viewportHeight = window.innerHeight;
//   const totalHeight = Math.max(
//     document.body.scrollHeight,
//     document.documentElement.scrollHeight
//   );
//   const screenshots: string[] = [];

//   let scrollY = 0;
//   while (scrollY < totalHeight) {
//     window.scrollTo(0, scrollY);
//     await delay(500); // Allow layout to settle

//     const { dataUrl }: { dataUrl: string } = await new Promise((resolve) => {
//       chrome.runtime.sendMessage({ action: "capture" }, resolve);
//     });

//     screenshots.push(dataUrl);
//     scrollY += viewportHeight;
//   }

//   window.scrollTo(0, 0); // Return to top

//   chrome.runtime.sendMessage({
//     action: "doneCapturing",
//     screenshots,
//   });
// })();

//test 01 and test 02
// (async () => {
//   const container = document.querySelector(
//     ".scrollable-container"
//   ) as HTMLElement;

//   if (!container) {
//     console.error("Container not found");
//     return; // ✅ VALID here — inside an async function
//   }
//   const totalHeight = container.scrollHeight;
//   const viewportHeight = container.clientHeight;
//   const screenshots: { dataUrl: string; startY: number; endY: number }[] = [];

//   let currentScrollTop = 0;
//   container.scrollTop = 0;
//   await new Promise((r) => setTimeout(r, 500));


//   function detectVisibleStickyOrAbsolute(container: HTMLElement): Element[] {
//     const all = Array.from(container.querySelectorAll("*"));
//     return all.filter((el) => {
//       const style = getComputedStyle(el);
//       const pos = style.position;
//       if (!["sticky", "fixed", "absolute"].includes(pos)) return false;

//       const rect = el.getBoundingClientRect();
//       const containerRect = container.getBoundingClientRect();

//       // Check if inside container’s visible viewport
//       const isVisible =
//         rect.bottom > containerRect.top &&
//         rect.top < containerRect.bottom &&
//         rect.right > containerRect.left &&
//         rect.left < containerRect.right;

//       return isVisible;
//     });
//   }

//   //test 01
//   // const removedStickyElements: {
//   //   original: Element;
//   //   parent: Element;
//   //   nextSibling: Node | null;
//   // }[] = [];

//   // while (true) {
//   //   const startY = container.scrollTop;

//   //   const { dataUrl }: { dataUrl: string } = await new Promise((resolve) =>
//   //     chrome.runtime.sendMessage({ action: "capture" }, resolve)
//   //   );

//   //   const endY = Math.min(startY + viewportHeight, totalHeight);
//   //   screenshots.push({ dataUrl, startY, endY });
//   //   console.log(`✅ Captured: ${startY}px → ${endY}px`);

//   //   //====
//   //   // 🔍 Detect sticky/fixed/absolute elements in current viewport
//   //   const visibleSticky = detectVisibleStickyOrAbsolute(container);
//   //   console.log(
//   //     "🔍 Visible sticky/fixed elements:",
//   //     visibleSticky
//   //   );

//   //   for (const el of visibleSticky) {
//   //     // removedStickyElements.push({
//   //     //   original: el.cloneNode(true) as Element,
//   //     //   parent: el.parentElement!,
//   //     //   nextSibling: el.nextSibling,
//   //     // });
//   //     console.warn("❌ Removing already captured sticky element:", el);
//   //     el.remove(); // 💥 permanently remove from DOM
//   //     // ✅ Wait until it's confirmed removed from DOM
//   //     await new Promise((resolve) => {
//   //       const checkRemoved = () => {
//   //         if (!document.body.contains(el)) {
//   //           resolve(null);
//   //         } else {
//   //           requestAnimationFrame(checkRemoved);
//   //         }
//   //       };
//   //       requestAnimationFrame(checkRemoved);
//   //     });
//   //   }

//   //   await new Promise((r) => setTimeout(r, 1000)); // let layout settle

//   //   if (endY >= totalHeight) {
//   //     console.log("✅ Reached bottom of container. Stopping.");
//   //     break;
//   //   }

//   //   const nextScrollTop = Math.min(
//   //     startY + viewportHeight,
//   //     totalHeight - viewportHeight
//   //   );

//   //   if (nextScrollTop <= currentScrollTop) {
//   //     console.warn("⚠️ Stuck scroll — cannot scroll further. Exiting.");
//   //     break;
//   //   }

//   //   container.scrollTop = nextScrollTop;
//   //   currentScrollTop = nextScrollTop;
//   //   await new Promise((r) => setTimeout(r, 1000));
//   // }

//   //test 02
// //   const seenStickyElements = new Map<Element, { top: number; bottom: number }>();

// // while (true) {
// //   const startY = container.scrollTop;

// //   const { dataUrl } = await new Promise<{ dataUrl: string }>((resolve) =>
// //     chrome.runtime.sendMessage({ action: "capture" }, resolve)
// //   );

// //   const endY = Math.min(startY + viewportHeight, totalHeight);
// //   screenshots.push({ dataUrl, startY, endY });
// //   console.log(`✅ Captured: ${startY}px → ${endY}px`);

// //   // ✅ Detect visible sticky/fixed/absolute elements
// //   const visibleSticky = detectVisibleStickyOrAbsolute(container);

// //   for (const el of visibleSticky) {
// //     const rect = el.getBoundingClientRect();

// //     // ✅ Track bounds the first time it appears
// //     if (!seenStickyElements.has(el)) {
// //       seenStickyElements.set(el, { top: rect.top, bottom: rect.bottom });
// //       console.log("📌 First seen sticky:", el);
// //     }

// //     // ❗ Defer removal until the full height has been visible
// //     const lastSeen = seenStickyElements.get(el)!;
// //     console.log('lastSeen',lastSeen)

// //     if (rect.top > container.getBoundingClientRect().bottom || rect.bottom < container.getBoundingClientRect().top) {
// //       console.warn("❌ Removing fully-captured sticky element:", el);
// //       el.remove();
// //     }
// //   }

// //   await new Promise((r) => setTimeout(r, 500));

// //   if (endY >= totalHeight) break;

// //   const nextScrollTop = Math.min(startY + viewportHeight, totalHeight - viewportHeight);
// //   if (nextScrollTop <= currentScrollTop) break;

// //   container.scrollTop = nextScrollTop;
// //   currentScrollTop = nextScrollTop;
// //   await new Promise((r) => setTimeout(r, 500));
// // }



// // ✅ Scroll back to top only after DOM is stable
// container.scrollTop = 0;

// chrome.runtime.sendMessage({
//   action: "doneCapturing",
//   screenshots,
// });

// })();

//test 03
// (async () => {
//   const container = document.querySelector(".scrollable-container") as HTMLElement;

//   if (!container) {
//     console.error("Container not found");
//     return;
//   }

//   const totalHeight = container.scrollHeight;
//   const viewportHeight = container.clientHeight;
//   const screenshots: { dataUrl: string; startY: number; endY: number }[] = [];

//   let currentScrollTop = 0;
//   container.scrollTop = 0;
//   await new Promise((r) => setTimeout(r, 500));

//   type StickyMeta = {
//     element: Element;
//     rect: DOMRect;
//     removed: boolean;
//   };

//   const stickyElementsSeen: Map<Element, StickyMeta> = new Map();

//   const detectVisibleStickyOrAbsolute = (): StickyMeta[] => {
//     const all = Array.from(container.querySelectorAll("*"));
//     return all
//       .filter((el) => {
//         const style = getComputedStyle(el);
//         if (!["sticky", "fixed", "absolute"].includes(style.position)) return false;
//         const rect = el.getBoundingClientRect();
//         const containerRect = container.getBoundingClientRect();
//         return (
//           rect.bottom > containerRect.top &&
//           rect.top < containerRect.bottom &&
//           rect.right > containerRect.left &&
//           rect.left < containerRect.right
//         );
//       })
//       .map((el) => ({ element: el, rect: el.getBoundingClientRect(), removed: false }));
//   };

//   let captureIndex = 0;

//   while (true) {
//     const startY = container.scrollTop;

//     // Capture screenshot
//     const { dataUrl }: { dataUrl: string } = await new Promise((resolve) =>
//       chrome.runtime.sendMessage({ action: "capture" }, resolve)
//     );

//     const endY = Math.min(startY + viewportHeight, totalHeight);
//     screenshots.push({ dataUrl, startY, endY });
//     console.log(`✅ Captured: ${startY}px → ${endY}px`);

//     const currentSticky = detectVisibleStickyOrAbsolute();

//     for (const meta of currentSticky) {
//       const { element, rect } = meta;

//       if (!stickyElementsSeen.has(element)) {
//         // First time seeing this sticky — store it
//         stickyElementsSeen.set(element, { element, rect, removed: false });
//       } else {
//         const seen = stickyElementsSeen.get(element);
//         if (!seen || seen.removed) continue;

//         const prevBottom = seen.rect.bottom;
//         const nowTop = rect.top;

//         // If there's overlap → it's split → KEEP
//         if (nowTop <= prevBottom) {
//           console.log("🔁 Sticky is split across screenshots. Keeping:", element);
//           continue;
//         }

//         // Else remove it
//         element.remove();
//         seen.removed = true;
//         console.warn("❌ Removed sticky not split:", element);

//         // Wait for confirmation it's removed from DOM
//         await new Promise((resolve) => {
//           const check = () => {
//             if (!document.body.contains(element)) resolve(null);
//             else requestAnimationFrame(check);
//           };
//           requestAnimationFrame(check);
//         });
//       }
//     }

//     if (endY >= totalHeight) {
//       console.log("✅ Reached bottom. Stopping.");
//       break;
//     }

//     const nextScrollTop = Math.min(startY + viewportHeight, totalHeight - viewportHeight);
//     if (nextScrollTop <= currentScrollTop) {
//       console.warn("⚠️ Stuck scroll — cannot scroll further.");
//       break;
//     }

//     container.scrollTop = nextScrollTop;
//     currentScrollTop = nextScrollTop;
//     await new Promise((r) => setTimeout(r, 1000));
//     captureIndex++;
//   }

//   container.scrollTop = 0;

//   chrome.runtime.sendMessage({
//     action: "doneCapturing",
//     screenshots,
//   });
// })();


//test 04
// (async () => {
//   const container = document.querySelector(".scrollable-container") as HTMLElement;
//   if (!container) {
//     console.error("Container not found");
//     return;
//   }

//   const totalHeight = container.scrollHeight;
//   const viewportHeight = container.clientHeight;
//   const screenshots: { dataUrl: string; startY: number; endY: number }[] = [];

//   container.scrollTop = 0;
//   await new Promise((r) => setTimeout(r, 500));

//   type StickyTrack = {
//     element: Element;
//     appearances: number[];
//     removed: boolean;
//   };

//   const stickyMap = new Map<Element, StickyTrack>();

//   function detectSticky(): Element[] {
//     return Array.from(container.querySelectorAll("*")).filter((el) => {
//       const style = getComputedStyle(el);
//       const pos = style.position;
//       return ["sticky", "fixed", "absolute"].includes(pos);
//     });
//   }

//   let captureIndex = 0;
//   let currentScrollTop = 0;

//   while (true) {
//     const startY = container.scrollTop;

//     const { dataUrl }: { dataUrl: string } = await new Promise((resolve) =>
//       chrome.runtime.sendMessage({ action: "capture" }, resolve)
//     );

//     const endY = Math.min(startY + viewportHeight, totalHeight);
//     screenshots.push({ dataUrl, startY, endY });
//     console.log(`✅ Captured: ${startY}px → ${endY}px`);

//     const stickies = detectSticky();

//     for (const el of stickies) {
//       if (!stickyMap.has(el)) {
//         stickyMap.set(el, { element: el, appearances: [startY], removed: false });
//       } else {
//         const meta = stickyMap.get(el)!;
//         meta.appearances.push(startY);
//       }
//     }

//     // Remove stickies that have appeared only once *after* their only capture
//     for (const [el, meta] of stickyMap.entries()) {
//       if (!meta.removed && meta.appearances.length === 1 && meta.appearances[0] < startY) {
//         console.warn("❌ Removing non-split sticky:", el);
//         el.remove();
//         meta.removed = true;

//         await new Promise((resolve) => {
//           const check = () => {
//             if (!document.body.contains(el)) resolve(null);
//             else requestAnimationFrame(check);
//           };
//           requestAnimationFrame(check);
//         });
//       }
//     }

//     if (endY >= totalHeight) {
//       console.log("✅ Reached bottom. Done.");
//       break;
//     }

//     const nextScrollTop = Math.min(startY + viewportHeight, totalHeight - viewportHeight);
//     if (nextScrollTop <= currentScrollTop) {
//       console.warn("⚠️ Scroll stuck. Exiting.");
//       break;
//     }

//     container.scrollTop = nextScrollTop;
//     currentScrollTop = nextScrollTop;
//     await new Promise((r) => setTimeout(r, 1000));
//     captureIndex++;
//   }

//   container.scrollTop = 0;

//   chrome.runtime.sendMessage({
//     action: "doneCapturing",
//     screenshots,
//   });
// })();


//test05
// (async () => {
//   const container = document.querySelector(".scrollable-container") as HTMLElement;
//   if (!container) {
//     console.error("Container not found");
//     return;
//   }

//   const totalHeight = container.scrollHeight;
//   const viewportHeight = container.clientHeight;
//   const screenshots: { dataUrl: string; startY: number; endY: number }[] = [];

//   container.scrollTop = 0;
//   await new Promise((r) => setTimeout(r, 500));

//   let firstCaptureDone = false;

//   while (true) {
//     const startY = container.scrollTop;

//     // Capture screenshot
//     const { dataUrl }: { dataUrl: string } = await new Promise((resolve) =>
//       chrome.runtime.sendMessage({ action: "capture" }, resolve)
//     );

//     const endY = Math.min(startY + viewportHeight, totalHeight);
//     screenshots.push({ dataUrl, startY, endY });
//     console.log(`✅ Captured: ${startY}px → ${endY}px`);

//     // 🚨 After first capture, remove sticky-tabs-ref manually
//     if (!firstCaptureDone) {
//       firstCaptureDone = true;
//       const el = document.querySelector(".sticky-tabs-ref");
//       if (el) {
//         console.warn("❌ Removing hardcoded sticky-tabs-ref");
//         el.remove();

//         // Wait until fully removed before scrolling
//         await new Promise((resolve) => {
//           const check = () => {
//             if (!document.body.contains(el)) resolve(null);
//             else requestAnimationFrame(check);
//           };
//           requestAnimationFrame(check);
//         });
//       }
//     }

//     if (endY >= totalHeight) {
//       console.log("✅ Reached bottom of container. Stopping.");
//       break;
//     }

//     const nextScrollTop = Math.min(startY + viewportHeight, totalHeight - viewportHeight);
//     if (nextScrollTop <= container.scrollTop) {
//       console.warn("⚠️ Scroll stuck. Exiting.");
//       break;
//     }

//     container.scrollTop = nextScrollTop;
//     await new Promise((r) => setTimeout(r, 800));
//   }

//   container.scrollTop = 0;

//   chrome.runtime.sendMessage({
//     action: "doneCapturing",
//     screenshots,
//   });
// })();


//test06
(async () => {
  const container = document.querySelector(".scrollable-container") as HTMLElement;
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

  chrome.runtime.sendMessage({
    action: "doneCapturing",
    screenshots,
  });
})();

