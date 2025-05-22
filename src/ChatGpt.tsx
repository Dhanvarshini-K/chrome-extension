import { useEffect, useState } from "react";
import TurnDown from "turndown";
import "./ChatGpt.css";
import { extractIdFromPath } from "./helpers/chatgpt/extractId";
import { ChatGptTabs, type ChatGptTabsType } from "./types/chatgpt.type";
import Button from "./components/Button/Button";
import Breadcrumbs from "./components/Breadcrumbs/Breadcrumbs";
import CopyButton from "./components/CopyButton/CopyButton";
import { saveOrUpdate } from "./utils";

type ExtractedData = {
  html: string;
  text: string;
};

type QueryData = {
  OID: string;
  Query: string;
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

  const [extractedTabs, setExtractedTabs] = useState<
    Record<ChatGptTabsType, boolean>
  >({
    html: false,
    markdown: false,
    citations: false,
  });

  const [id, setId] = useState<string>("");

  const tabs: ChatGptTabsType[] = Object.values(ChatGptTabs);

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
    if (!extractedTabs[tabName]) {
      if (tabName === ChatGptTabs.CITATIONS) {
        triggerExtractCitations();
      } else {
        triggerExtract();
      }

      setExtractedTabs((prev) => ({
        ...prev,
        [tabName]: true,
      }));
    }
    setActiveTab(tabName);
  };

  const { OID = "", Query ="" } = queryData || {};

  const savePayload = async () => {
    const responseText = output?.markdownSingleLine || "";
    const responseHTML = output?.htmlSingleLine || "";
    const sources =
      citations.includes("No content found") && !citations.startsWith("[")
        ? ""
        : citations;
    const timestamp = formattedDate;

    const isComplete =
      id && OID && Query && responseText && responseHTML && timestamp;
    const responseCode = isComplete ? "Success" : "";

    const payload = {
      ChatID: id,
      OID,
      Query,
      ResponseHTML: responseText,
      ResponseText: responseHTML,
      Sources: sources,
      TimeStamp: timestamp,
      ResponseCode:responseCode,
    };

    console.log("payload", payload);

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
        goQueryList();
      }, 1000);
    } else {
      savePayload();
      goQueryList();
    }
  };

  return (
    <div className="query-details-container">
      <Breadcrumbs
        showHome
        showQueryList
        onHomeClick={goHome}
        onQueryListClick={goQueryList}
      />
      <p className="query-details-title">Query Details</p>

      <div className="field-value-container">
        <div>
          <p className="field-text">Query ID:</p>
          <div className="value-container">
            <span>{OID}</span>
            <CopyButton value={OID} />
          </div>
        </div>

        <div>
          <p className="field-text">Query:</p>
          <div className="value-container">
            <span>{Query}</span>
            <CopyButton value={Query} />
          </div>
        </div>

        <div>
          <p className="field-text">Chat ID:</p>
          <div className="value-container">
            <span>{id}</span>
            <CopyButton value={id} />
          </div>
        </div>

        <div>
          <p className="field-text">Date:</p>
          <div className="value-container">
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
            <CopyButton value={formattedDate} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <Button onClick={removeDiv}>Remove Related Divs</Button>
      </div>

      <div className="tab-buttons">
        {tabs.map((tab) => (
          <Button
            key={tab}
            className={`tab-button ${extractedTabs[tab] ? "extracted" : ""}`}
            onClick={() => handleTabClick(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === ChatGptTabs.HTML && output && (
          <div>
            <CopyButton value={output.htmlSingleLine} />
            <pre className="pre-block">{output.htmlSingleLine}</pre>
          </div>

        )}
        {activeTab === ChatGptTabs.MARKDOWN && output && (
          <div>
            <CopyButton value={output.markdownSingleLine} />
            <pre className="pre-block">{output.markdownSingleLine}</pre>
          </div>
        )}
        {activeTab === ChatGptTabs.CITATIONS && citations && (
          <div>
            <CopyButton value={citations} />
            <pre className="pre-block">{citations}</pre>
          </div>
        )}
      </div>

      <div className="save-extract-buttons-container">
        <Button
          onClick={handleSave}
          disabled={
            !extractedTabs.html ||
            !extractedTabs.markdown ||
            !extractedTabs.citations
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default Chatgpt;
