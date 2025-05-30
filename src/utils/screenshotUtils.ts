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

export const stitchAndDownload = async (images: string[],fileName:string) => {
    const loadedImgs = await Promise.all(
        images.map(
            (src) =>
                new Promise<HTMLImageElement>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.src = src;
                })
        )
    );

    const width = loadedImgs[0].width;
    const totalHeight = loadedImgs.reduce((sum, img) => sum + img.height, 0);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = totalHeight;

    const ctx = canvas.getContext("2d")!;
    let offsetY = 0;
    for (const img of loadedImgs) {
        ctx.drawImage(img, 0, offsetY);
        offsetY += img.height;
    }

    const finalImage = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = finalImage;
    link.download = fileName;
    link.click();
};