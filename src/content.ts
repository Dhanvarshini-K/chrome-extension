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

(async () => {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const viewportHeight = window.innerHeight;
  const totalHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const screenshots: string[] = [];

  let scrollY = 0;
  while (scrollY < totalHeight) {
    window.scrollTo(0, scrollY);
    await delay(500); // Allow layout to settle

    const { dataUrl }: { dataUrl: string } = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "capture" }, resolve);
    });

    screenshots.push(dataUrl);
    scrollY += viewportHeight;
  }

  window.scrollTo(0, 0); // Return to top

  chrome.runtime.sendMessage({
    action: "doneCapturing",
    screenshots,
  });
})();
