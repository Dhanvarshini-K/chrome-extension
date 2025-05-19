/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import TurnDown from "turndown";
import "./App.css";
import { extractIdFromPath } from "./helpers/chatgpt/extractId";
import type { ChatGptTabsType } from "./types/chatgpt.type";

type ExtractedData = {
  html: string;
  text: string;
};

function Chatgpt() {
  const [data, setData] = useState<ExtractedData>({ html: "", text: "" });
  const [citations, setCitations] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ChatGptTabsType>("");

  const [id, setId] = useState<string>("");

  useEffect(() => {
    const extractIdFromUrl = async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const url = tab.url || "";
      const id = extractIdFromPath(url);
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

  const triggerExtractCitations = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id! },
        func: () => {
          const anchors: NodeListOf<HTMLAnchorElement> =
            document.querySelectorAll("[slot='content'] a");

          const links = Array.from(anchors).map((a) => {
            if (a && a?.href) {
              const href = a.href;
              console.log("Href:", a);
              const titleDiv = a.querySelector("div.text-sm.font-semibold");
              console.log("Title Div:", titleDiv);
              const title = titleDiv?.textContent?.trim() || "No Title";
              return `[${title}](${href})`;
            }
          });

          return links.join("##NEWLINE##");
        },
      },
      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        setCitations(result || "No content found");
      }
    );
  };

  const triggerExtract = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id! },
        func: () => {
          const el = document.querySelector(".markdown");
          console.log("Element:", el);
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

        // aria-label="Edit in canvas"
        const button = document.querySelector('[data-testid="copy-turn-action-button"]');
        console.log("button",button)
        if(button){
          button.parentElement?.parentElement?.parentElement?.remove()
        }

        document.querySelector("#sidebar")?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.remove()

        const targetDivs = [
          ".group-footnote",
        ];

        const targetDivs2 = [
          "#conversation-header-actions",
          "#thread-bottom",
          "#page-header",
          "#thread-bottom-container",
          "#sidebar-header",
          "#sidebar"
        ];
        targetDivs2.forEach((selector) => {
          const divs = document.querySelectorAll(selector);
          divs.forEach((div) => div.remove());
        });

        targetDivs.forEach((selector) => {
          const divs = document.querySelectorAll(selector);
          divs.forEach((div) => div.remove());
        });
          document.documentElement.style.overflow = "auto";
  document.body.style.overflow = "auto";
  document.body.style.height = "auto";
      },
    });
  };

  const [isExtracted, setIsExtracted] = useState(false);
  const [isCitations, setIsCitations] = useState(false);

  const handleTabClick = (tabName: ChatGptTabsType) => {
    if (tabName === "citations" && !isCitations) {
      triggerExtractCitations();
      setIsCitations(true);
    } else if (tabName !== "citations" && !isExtracted) {
      triggerExtract();
      setIsExtracted(true);
    }
    setActiveTab(tabName);
  };

  return (
    <div style={{ padding: "1rem", width: 300 }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        ChatGPT Extractor v1.7
      </h2>
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
        <button
          style={{
            flex: 1,
            backgroundColor: activeTab === "citations" ? "#ddd" : "#fff",
          }}
          onClick={() => handleTabClick("citations")}
        >
          Citations
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

        {activeTab === "citations" && citations && (
          <div>
            <button onClick={() => copyToClipboard(citations)}>
              Copy Citations
            </button>
            <pre style={{ whiteSpace: "pre-wrap" }}>{citations}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chatgpt;
