// (() => {
//   // Override window.open to capture the URL
//   window.open = function (
//     url?: string | URL,
//     _target?: string,
//     _features?: string
//   ): Window | null {
//     (window as any)._capturedURL = url?.toString() ?? "";
//     return null;
//   };

//   interface Citation {
//     title: string;
//     url: string;
//   }

//   const sources: Citation[] = [];
//   const elements = document.querySelectorAll<HTMLDivElement>(
//     "div.cursor-pointer div.line-clamp-1.transition-colors"
//   );

//   elements.forEach((element) => {
//     element.click();

//     const title = element.innerText;
//     const url = (window as any)._capturedURL || "";

//     sources.push({ title, url });
//   });

//   const markdown = sources
//     .map((page) => `[${page.title}](${page.url})`)
//     .join("##NEWLINE##");

//   console.log("📝 Extracted Citations:\n" + markdown);

//   chrome.runtime.sendMessage({
//     type: "CITATIONS_FOUND",
//     payload: sources,
//   });
// })();

(() => {
  (window as any).open = function (url?: string | URL) {
    (window as any)._capturedURL = url?.toString() ?? "";
    return null;
  };


  interface Citation {
    title: string;
    url: string;
  }

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const sources: Citation[] = [];
  const elements = document.querySelectorAll<HTMLDivElement>(
    "div.cursor-pointer div.line-clamp-1.transition-colors"
  );

  const run = async () => {
   localStorage.removeItem(`citations`);

    for (const element of elements) {
      (window as any)._capturedURL = "";
      element.click();
      // element.addEventListener('click', (e) => e.preventDefault());
      await delay(300);

      const title = element.innerText.trim();
      const url = (window as any)._capturedURL || "";

      if (title && url) {
        sources.push({ title, url });
      }
    }

    console.log("sources", sources);


    localStorage.setItem(`citations`, JSON.stringify(sources));

    window.postMessage(
      {
        type: "CITATIONS_FOUND",
        citations: sources,
      },
      "*"
    );
  };
  run();
  
})();
