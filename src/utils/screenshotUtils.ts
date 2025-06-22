export const handleScreenshot = async (fileName:string) => {
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
                stitchAndDownload(message.screenshots,fileName);
                chrome.runtime.onMessage.removeListener(listener); // Clean up
            }
        });
    });
};

// export const stitchAndDownload = async (images: string[],fileName:string) => {
//     const loadedImgs = await Promise.all(
//         images.map(
//             (src) =>
//                 new Promise<HTMLImageElement>((resolve) => {
//                     const img = new Image();
//                     img.onload = () => resolve(img);
//                     img.src = src;
//                 })
//         )
//     );

//     const width = loadedImgs[0].width;
//     const totalHeight = loadedImgs.reduce((sum, img) => sum + img.height, 0);

//     const canvas = document.createElement("canvas");
//     canvas.width = width;
//     canvas.height = totalHeight;

//     const ctx = canvas.getContext("2d")!;
//     let offsetY = 0;
//     for (const img of loadedImgs) {
//         ctx.drawImage(img, 0, offsetY);
//         offsetY += img.height;
//     }

//     const finalImage = canvas.toDataURL("image/png");
//     const link = document.createElement("a");
//     link.href = finalImage;
//     link.download = fileName;
//     link.click();
// };


//test
export const stitchAndDownload = async (
  images: { dataUrl: string; startY: number; endY: number }[],
  fileName: string
) => {
  console.log('images', images);

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

  const width = loadedImgs[0].naturalWidth;
  const totalHeight = loadedImgs.reduce((sum, img) => sum + img.naturalHeight, 0);

  // Create canvas for final image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d")!;
  let offsetY = 0;

  ctx.font = "16px monospace";
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.textBaseline = "top";

//   for (let i = 0; i < loadedImgs.length; i++) {
//     const img = loadedImgs[i];
//     const { startY, endY } = images[i];

//     // Draw screenshot
//     ctx.drawImage(img, 0, offsetY);

//     // Draw text over the image at top-left of this segment
//     const label = `Part ${i + 1}: ${startY}px → ${endY}px (${endY - startY}px)`;
//     ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
//     ctx.fillRect(0, offsetY, ctx.measureText(label).width + 10, 20); // background for readability
//     ctx.fillStyle = "white";
//     ctx.fillText(label, 5, offsetY + 2); // draw over background

//     offsetY += img.naturalHeight;
//   }

  // Convert and trigger download
  
  //test 04
//   for (let i = 0; i < loadedImgs.length; i++) {
//   const img = loadedImgs[i];
//   const { startY, endY } = images[i];

//   // Detect how much of the top needs to be cropped
//   let cropTop = 0;
//   if (i > 0) {
//     const prevEndY = images[i - 1].endY;
//     if (startY < prevEndY) {
//       cropTop = prevEndY - startY; // overlapping region
//     }
//   }

//   const cropHeight = img.naturalHeight - cropTop;

//   // ✅ Draw cropped screenshot
//   ctx.drawImage(
//     img,
//     0, cropTop,                    // crop from this Y
//     img.naturalWidth, cropHeight, // crop this much height
//     0, offsetY,                    // draw here
//     img.naturalWidth, cropHeight  // draw this much
//   );

//   // 📍 Draw label
//   const label = `Part ${i + 1}: ${startY}px → ${endY}px (${endY - startY}px)`;
//   ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
//   ctx.fillRect(0, offsetY, ctx.measureText(label).width + 10, 20);
//   ctx.fillStyle = "white";
//   ctx.fillText(label, 5, offsetY + 2);

//   offsetY += cropHeight;
// }

//test 04.1
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
    0, cropTop,
    img.naturalWidth, cropHeight,
    0, offsetY,
    img.naturalWidth, cropHeight
  );

  // // 🏷️ Label for visual debugging
  const label = `Part ${i + 1}: ${startY.toFixed(2)} → ${endY.toFixed(2)} (${(endY - startY).toFixed(2)}px)`;
  console.log('label',label)
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, offsetY, ctx.measureText(label).width + 10, 20);
  ctx.fillStyle = "white";
  ctx.fillText(label, 5, offsetY + 2);

  offsetY += cropHeight;
}


  const finalImage = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = finalImage;
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  link.click();

};