(() => {
  // Override window.open to capture the URL
  window.open = function (
    url?: string | URL,
    _target?: string,
    _features?: string
  ): Window | null {
    (window as any)._capturedURL = url?.toString() ?? "";
    return null;
  };

  interface Citation {
    title: string;
    url: string;
  }

  const sources: Citation[] = [];
  const elements = document.querySelectorAll<HTMLDivElement>(
    "div.cursor-pointer div.line-clamp-1.transition-colors"
  );

  elements.forEach((element) => {
    element.click();

    const title = element.innerText;
    const url = (window as any)._capturedURL || "";

    sources.push({ title, url });
  });

  const markdown = sources
    .map((page) => `[${page.title}](${page.url})`)
    .join("##NEWLINE##");

  console.log("📝 Extracted Citations:\n" + markdown);

  window.postMessage(
    {
      type: "CITATIONS_DATA_FROM_PAGE",
      payload: markdown,
    },
    "*"
  );
})();
