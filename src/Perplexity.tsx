/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import TurnDown from "turndown";
import "./App.css";
import Button from "./components/Button/Button";
import CopyButton from "./components/CopyButton/CopyButton";
import Breadcrumbs from "./components/Breadcrumbs/Breadcrumbs";
import { AgentToAiType, AiAlias, ResponseTabs, type AiAliasType, type AiType, type QueryFormData, type ResponseTabsType } from "./types";
import { handleScreenshot } from "./utils/screenshotUtils";
import { saveOrUpdate } from "./utils";

type ExtractedData = {
  html: string;
  text: string;
};


interface PerplexityProps {
  goBack?: () => void;
  goHome: () => void;
  goQueryList: () => void;
  queryData: QueryFormData | null;
  refreshQueryData: () => Promise<void>;
}

function Perplexity({ queryData, goHome, goQueryList, refreshQueryData }: PerplexityProps) {
  const [data, setData] = useState<ExtractedData>({ html: "", text: "" });
  const [activeTab, setActiveTab] = useState<ResponseTabsType>(ResponseTabs.HTML);
  const [id, setId] = useState<string>("");

  let citations = '';


  const [extractedTabs, setExtractedTabs] = useState<
    Record<ResponseTabsType, boolean>
  >({
    html: false,
    markdown: false,
    citations: false,
  });
  const triggerExtractCitations = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      console.error("Could not find active tab ID.");
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("inject.js");
        document.documentElement.appendChild(script);
      },
    });



  };


  useEffect(() => {
    const extractAllData = async () => {
      await triggerExtract();
      await triggerExtractCitations();
      citations =localStorage.getItem("citations") || "";

      
      setExtractedTabs({
        html: true,
        markdown: true,
        citations: true,
      });
    };

    extractAllData();
  }, []);

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


  const handleTabClick = (tabName: ResponseTabsType) => {
    setActiveTab(tabName);
  };


  const { OID = "", Query = "", Engine = "" } = queryData || {};

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

  const tabs: ResponseTabsType[] = Object.values(ResponseTabs);

  const aiType: AiType = AgentToAiType[Engine];  // "chatgpt"
  const alias: AiAliasType = AiAlias[aiType];        // "cgp"
  const ResponseImage = `${alias}${OID}.png`;       // "cgp123.png"


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
      ResponseText: responseText,
      ResponseHTML: responseHTML,
      Sources: sources,
      TimeStamp: timestamp,
      ResponseImage,
      ResponseCode: responseCode
    };

    try {
      await saveOrUpdate(payload);
      await refreshQueryData();
      goQueryList();
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

      <div style={{ marginBottom: "1rem" }}>
        <Button onClick={() => handleScreenshot(ResponseImage)}>Screenshot</Button>
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
        {activeTab === ResponseTabs.HTML && output && (
          <div>
            <CopyButton value={output.htmlSingleLine} />
            <pre className="pre-block">{output.htmlSingleLine}</pre>
          </div>
        )}
        {activeTab === ResponseTabs.MARKDOWN && output && (
          <div>
            <CopyButton value={output.markdownSingleLine} />
            <pre className="pre-block">{output.markdownSingleLine}</pre>
          </div>
        )}
        {activeTab === ResponseTabs.CITATIONS && citations && (
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
}

export default Perplexity;
