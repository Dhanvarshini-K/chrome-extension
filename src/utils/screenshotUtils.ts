export const handleScreenshot = async (fileName: string) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id!;

    // Inject the content script to scroll and trigger capture
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

    // Listen for final images
    chrome.runtime.onMessage.addListener(function listener(message) {
      if (message.action === "doneCapturing") {
        stitchAndDownload(message.screenshots, fileName);
        chrome.runtime.onMessage.removeListener(listener); // Clean up
      }
    });
  });
};

export const stitchAndDownload = async (
  images: { dataUrl: string; startY: number; endY: number }[],
  fileName: string
) => {

  // Load all images
  const loadedImgs = await Promise.all(
    images.map(
      (image) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = image.dataUrl;
        })
    )
  );

  function getScrollbarWidth(): number {
    const outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.overflow = "scroll";
    outer.style.position = "absolute";
    outer.style.top = "-9999px";
    outer.style.width = "100px";
    document.body.appendChild(outer);

    const inner = document.createElement("div");
    inner.style.width = "100%";
    outer.appendChild(inner);

    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.remove();

    return scrollbarWidth;
  }

  const SCROLLBAR_WIDTH = getScrollbarWidth();
  const originalWidth = loadedImgs[0].naturalWidth;
  const width = originalWidth - SCROLLBAR_WIDTH;

  const totalHeight = loadedImgs.reduce(
    (sum, img) => sum + img.naturalHeight,
    0
  );

  // Create canvas for final image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d")!;
  let offsetY = 0;

  ctx.font = "16px monospace";
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.textBaseline = "top";

  for (let i = 0; i < loadedImgs.length; i++) {
    const img = loadedImgs[i];
    const { startY, endY } = images[i];

    // 🧠 Overlap calculation using visual ratios
    let cropTop = 0;
    if (i > 0) {
      const prevEndY = images[i - 1].endY;
      const scrollOverlap = prevEndY - startY;

      if (scrollOverlap > 0) {
        const scrollSpan = endY - startY;
        const cropRatio = scrollOverlap / scrollSpan;
        cropTop = Math.round(img.naturalHeight * cropRatio);
      }
    }

    const cropHeight = img.naturalHeight - cropTop;

    // ✂️ Apply cropping during drawing
    ctx.drawImage(
      img,
      0,
      cropTop,
      img.naturalWidth,
      cropHeight,
      0,
      offsetY,
      img.naturalWidth,
      cropHeight
    );

    offsetY += cropHeight;
  }

  const finalImage = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = finalImage;
  link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
  link.click();
};