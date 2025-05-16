/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import TurnDown from "turndown";
import "./App.css";

type ExtractedData = {
  html: string;
  text: string;
};

let citations = `window.open = function(url) { window._capturedURL = url; return null; };
let sources = [];
document.querySelectorAll('div.cursor-pointer div.line-clamp-1.transition-colors').forEach(x => {
  x.click();
  sources.push({
    title: x.innerHTML,
    url: window._capturedURL
  });
});`;
citations +=
  "const md = sources.map(page => `[${page.title}](${page.url})`).join('##NEWLINE##');";
citations += "copy(md);";

function Perplexity() {
  const [data, setData] = useState<ExtractedData>({ html: "", text: "" });
  const [activeTab, setActiveTab] = useState<"html" | "markdown" | "">("");
  // const [screenshot, setScreenshot] = useState<string>("");

  const [id, setId] = useState<string>("");

  useEffect(() => {
    const extractIdFromUrl = async () => {
      console.log("Extracting ID from URL...");
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const url = tab.url || "";
      console.log("URL:", url);
      function extractLastSegment(text: string) {
        // Remove query string if present
        const cleanedText = text.split("?")[0];

        // Split by hyphen and return the last part
        const parts = cleanedText.split("-");
        return parts[parts.length - 1];
      }
      const id = extractLastSegment(url);
      console.log("Extracted ID:", id);
      if (id) {
        setId(id);
      }
    };

    extractIdFromUrl();
  }, []);

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "EXTRACTED_HTML") {
        setData({ html: message.html, text: message.text });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const triggerExtract = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id! },
        func: () => {
          const el = document.querySelector('[id^="markdown-content"]');
          return el ? el.outerHTML : "No content found";
        },
      },
      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        setData({ html: result as string, text: "" });
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderOutput = () => {
    if (!data.html) return null;

    const htmlSingleLine = data.html
      .replace(/\s+/g, " ")
      .replace(/\t/g, " ")
      .replace(/\n/g, " ")
      .trim();
    const turndownService = new TurnDown();
    const markdown = turndownService.turndown(htmlSingleLine);
    const markdownSingleLine = markdown
      .replace(/\s+/g, " ")
      .replace(/\t/g, " ")
      .replace(/\n/g, " ")
      .trim();

    return { htmlSingleLine, markdownSingleLine };
  };

  const output = renderOutput();

  const removeDiv = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        const divs = document.querySelectorAll(".gap-y-md > div");

        const hasImage = document.querySelector("button .rounded-inherit");
        let divToDelete = 2;
        if (hasImage) {
          divToDelete = 3;
        }
        console.log("Divs:", divs);
        const footer = divs?.[divToDelete];
        if (footer) {
          footer.remove();
        }
        const targetDivs = [
          ".animate-in.fade-in.duration-100.ease-out.border-borderMain\\/50.ring-borderMain\\/50.divide-borderMain\\/50.dark\\:divide-borderMainDark\\/50.dark\\:ring-borderMainDark\\/50.dark\\:border-borderMainDark\\/50.bg-transparent",
          ".table .relative.flex",
          ".max-w-threadContentWidth .gap-y-sm .min-w-full",
          ".group\\/sidebar",
          ".-ml-sm.items-center",
          ".grow.block",
          ".h-headerHeight",
        ];

        targetDivs.forEach((selector) => {
          const divs = document.querySelector(selector);
          if (divs) {
            divs.remove();
          }
        });

        document.querySelectorAll("*").forEach((el: any) => {
          el.style.color = "#555";
        });
        // Remove specific layout elements with escaped selectors
        [
          ...document.querySelectorAll("div.-mx-sm.gap-xs.relative.flex"),
          ...document.querySelectorAll("div.gap-sm.grid.grid-cols-4.md\\:px-0"),
        ].forEach((el) => el.remove());
      },
    });
  };

  const [isExtracted, setIsExtracted] = useState(false);

  const handleTabClick = (tabName: string) => {
    if (!isExtracted) {
      triggerExtract();
      setIsExtracted(true);
    }
    setActiveTab(tabName as "html" | "markdown");
  };

  return (
    <div style={{ padding: "1rem", width: 300 }}>
      <div style={{ marginTop: "1rem" }}>
        <div className="flex font-large">
          <p> ID: {id}</p>
          <button onClick={() => copyToClipboard(id)}>Copy </button>
        </div>
        <div className="flex font-large" style={{ marginTop: "1rem" }}>
          <p>
            Date:{" "}
            {new Date()
              .toLocaleString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              .replace(",", "")}
          </p>
          <button
            onClick={() =>
              copyToClipboard(
                new Date()
                  .toLocaleString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                  .replace(",", "")
              )
            }
          >
            Copy
          </button>
        </div>
      </div>
      <div className="button-container">
        {/* <button onClick={triggerExtract} style={{ marginBottom: "1rem" }}>
          Extract Content
        </button> */}

        <button
          onClick={() => copyToClipboard(citations)}
          style={{ marginBottom: "1rem" }}
        >
          Copy Citations script
        </button>

        <button onClick={removeDiv} style={{ marginBottom: "1rem" }}>
          Remove Related Div
        </button>
      </div>
      <div style={{ display: "flex", marginTop: "1rem", gap: "8px" }}>
        <button
          style={{
            flex: 1,
            backgroundColor: activeTab === "html" ? "#ddd" : "#fff",
          }}
          onClick={() => handleTabClick("html")}
        >
          HTML
        </button>
        <button
          style={{
            flex: 1,
            backgroundColor: activeTab === "markdown" ? "#ddd" : "#fff",
          }}
          onClick={() => handleTabClick("markdown")}
        >
          Markdown
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        {activeTab === "html" && output && (
          <div>
            <button onClick={() => copyToClipboard(output.htmlSingleLine)}>
              Copy HTML
            </button>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {output.htmlSingleLine}
            </pre>
          </div>
        )}

        {activeTab === "markdown" && output && (
          <div>
            <button onClick={() => copyToClipboard(output.markdownSingleLine)}>
              Copy Markdown
            </button>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {output.markdownSingleLine}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default Perplexity;
