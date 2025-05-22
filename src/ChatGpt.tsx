import { useEffect, useState } from "react";
import TurnDown from "turndown";
import "./App.css";
import { extractIdFromPath } from "./helpers/chatgpt/extractId";
import type { ChatGptTabsType } from "./types/chatgpt.type";
import { getAllFromIndexedDB, saveOrUpdate } from "./helpers/indexedDB/indexedDB";
import Button from "./components/button/Button";
import Breadcrumbs from "./components/Breadcrumbs/Breadcrumbs";

type ExtractedData = {
  html: string;
  text: string;
};

type QueryData = {
  OID: string;
  query: string;
};

interface ChatGptProps {
  goBack?: () => void;
  goHome: () => void;
  goQueryList: () => void;
  queryData: QueryData | null;
}

const Chatgpt = ({ goHome, goQueryList, queryData }: ChatGptProps) => {
  const [data, setData] = useState<ExtractedData>({ html: "", text: "" });
  const [citations, setCitations] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ChatGptTabsType>("");

  const [isExtracted, setIsExtracted] = useState(false);
  const [isCitations, setIsCitations] = useState(false);

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

  const formattedDate = new Date()
    .toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");

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
      .replace(/\n/g, "##NEWLINE##")
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
        const button = document.querySelector(
          '[data-testid="copy-turn-action-button"]'
        );
        console.log("button", button);
        if (button) {
          button.parentElement?.parentElement?.parentElement?.remove();
        }

        document
          .querySelector("#sidebar")
          ?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.remove();

        const targetDivs = [".group-footnote"];

        const targetDivs2 = [
          "#conversation-header-actions",
          "#thread-bottom",
          "#page-header",
          "#thread-bottom-container",
          "#sidebar-header",
          "#sidebar",
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

  const { OID, query } = queryData || {};

  const savePayload = async () => {
    const responseText = output?.markdownSingleLine || "";
    const responseHTML = output?.htmlSingleLine || "";
    const sources =
      citations.includes("No content found") && !citations.startsWith("[")
        ? ""
        : citations;
    const timestamp = formattedDate;

    const payload = {
      chatId: id,
      queryId: OID,
      query: query,
      responseText,
      responseHTML,
      citations: sources,
      timestamp,
    };

    try {
      await saveOrUpdate(payload);
      alert("Saved successfully to IndexedDB!");
    } catch (error) {
      console.error("Error saving to IndexedDB:", error);
      alert("Error saving data.");
    }
  };

  const handleSave = async () => {
    if (!data.html) {
      console.log("Triggering extract since data.html is empty...");
      await triggerExtract();
      setTimeout(() => {
        savePayload();
      }, 1000);
    } else {
      savePayload();
    }
  };

  function escapeTSVField(value: string) {
    return `"${String(value)
      .replace(/"/g, '""')       // Escape double quotes
      .replace(/\t/g, ' ')       // Replace tab characters with space
      .replace(/\r?\n/g, '\n')   // Normalize newlines
      }"`;
  }


  async function handleExtract() {
    try {
      const allData = await getAllFromIndexedDB();   

      if (allData.length === 0) {
        console.error("No data found in IndexedDB.");
        return;
      }

      const headers = [
        "chatid",
        "responseText",
        "responseHTML",
        "sources",
        "responseImage",
        "perfdata",
        "agent",
        "timestamp",
      ];


      const rows = allData.map((data: any) => {
        const { chatId, citations, responseText, responseHTML, timestamp } =
          data;
        const sanitizedResponseText = escapeTSVField(responseText);
        const sanitizedResponseHTML = escapeTSVField(responseHTML);
        return [
          escapeTSVField(chatId || ""),
          sanitizedResponseText,
          sanitizedResponseHTML,
          escapeTSVField(citations || ""),
          escapeTSVField("6.png"),
          escapeTSVField("{}"),
          escapeTSVField("v-bvenkatesa"),
          escapeTSVField(timestamp || ""),
        ].join("\t");
      });

      const tsvContent = [headers.join("\t"), ...rows].join("\n");

      const blob = new Blob([tsvContent], {
        type: "text/tab-separated-values;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "output.tsv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error in handleExtract:", error);
    }
  }

  return (
    <div
      style={{ padding: "1rem", width: 320, fontFamily: "Arial, sans-serif" }}
    >
      <Breadcrumbs
        showHome
        showQueryList
        onHomeClick={goHome}
        onQueryListClick={goQueryList}
      />
      <h2
        style={{
          fontSize: "1.5rem",
          marginBottom: "1rem",
          textAlign: "center",
        }}
      >
        Query Details
      </h2>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem",
          background: "#f9f9f9",
        }}
      >
        <div style={{ marginBottom: "0.5rem" }}>
          <strong>Query ID:</strong>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{OID ?? ""}</span>
          </div>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <strong>Query:</strong>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{query}</span>
          </div>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <strong>Chat ID:</strong>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{id}</span>
          </div>
        </div>

        <div>
          <strong>Date:</strong>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
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
            </span>
          </div>
        </div>
      </div>

      <div className="button-container" style={{ marginBottom: "1rem" }}>
        <Button
          onClick={removeDiv}
          style={{
            backgroundColor: "#e74c3c",
            color: "#fff",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Remove Related Divs
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "1rem",
        }}
      >
        {["html", "markdown", "citations"].map((tab) => (
          <Button
            key={tab}
            style={{
              flex: 1,
              padding: "0.5rem",
              backgroundColor: activeTab === tab ? "#3498db" : "#ecf0f1",
              color: activeTab === tab ? "#fff" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={() => handleTabClick(tab as ChatGptTabsType)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        {activeTab === "html" && output && (
          <div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#f0f0f0",
                padding: "0.5rem",
              }}
            >
              {output.htmlSingleLine}
            </pre>
          </div>
        )}

        {activeTab === "markdown" && output && (
          <div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#f0f0f0",
                padding: "0.5rem",
              }}
            >
              {output.markdownSingleLine}
            </pre>
          </div>
        )}

        {activeTab === "citations" && citations && (
          <div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#f0f0f0",
                padding: "0.5rem",
              }}
            >
              {citations}
            </pre>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <Button
          onClick={handleSave}
          disabled={!data.html}
          style={{
            flex: 1,
            backgroundColor: "#3498db",
            color: "#fff",
            padding: "0.5rem",
            borderRadius: "4px",
            border: "none",
            cursor: data.html ? "pointer" : "not-allowed",
          }}
        >
          Save
        </Button>

        <Button
          onClick={handleExtract}
          style={{
            flex: 1,
            backgroundColor: "#27ae60",
            color: "#fff",
            padding: "0.5rem",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Extract
        </Button>
      </div>
    </div>
  );
};

export default Chatgpt;
