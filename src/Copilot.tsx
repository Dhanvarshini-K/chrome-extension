import { useEffect, useState } from "react";
import TurnDown from "turndown";
import "./ChatGpt.css";
import { extractIdFromPathForCopilot } from "./helpers/chatgpt/extractId";
import Button from "./components/Button/Button";
import Breadcrumbs from "./components/Breadcrumbs/Breadcrumbs";
import CopyButton from "./components/CopyButton/CopyButton";
import { saveOrUpdate } from "./utils";
import {
  type ResponseTabsType,
  ResponseTabs,
  type AiType,
  AgentToAiType,
  type AiAliasType,
  AiAlias,
  type QueryFormData,
} from "./types";
import { handleScreenshot } from "./utils/screenshotUtils";

type ExtractedData = {
  html: string;
  text: string;
};

interface CopilotProps {
  goBack?: () => void;
  goHome: () => void;
  goQueryList: () => void;
  queryData: QueryFormData | null;
  refreshQueryData: () => Promise<void>;
}

const Copilot = ({
  goHome,
  goQueryList,
  queryData,
  refreshQueryData,
}: CopilotProps) => {
  const [data, setData] = useState<ExtractedData>({ html: "", text: "" });
  const [citations, setCitations] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ResponseTabsType>(
    ResponseTabs.HTML
  );

  const [extractedTabs, setExtractedTabs] = useState<
    Record<ResponseTabsType, boolean>
  >({
    html: false,
    markdown: false,
    citations: false,
  });

  const [id, setId] = useState<string>("");

  const tabs: ResponseTabsType[] = Object.values(ResponseTabs);

  useEffect(() => {
    const extractIdFromUrl = async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const url = tab.url || "";
      const id = extractIdFromPathForCopilot(url);
      if (id) {
        setId(id);
      }
    };

    extractIdFromUrl();
  }, []);

  useEffect(() => {
    const extractAllData = async () => {
      await triggerExtract();
      await triggerExtractCitations();

      setExtractedTabs({
        html: true,
        markdown: true,
        citations: true,
      });
    };

    extractAllData();
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
            document.querySelectorAll("div[data-copy='false'] ul li a");

          const links = Array.from(anchors).map((a) => {
            if (a && a?.href) {
              const href = a.href;
              const title = a.getAttribute("title");
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
          const el = document.querySelector(
            "main div[data-content=ai-message] div"
          );
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

const removeDiv = async (): Promise<void> => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func: () => {
      // Remove Share and User buttons
      document.querySelectorAll(".flex.gap-4 > div").forEach((div) => {
        const button = div.querySelector("button");
        if (
          button?.title === "Share message and prompt" ||
          button?.getAttribute("data-testid") === "settings-button"
        ) {
          div.remove();
        }
      });

      // Remove buttons by title
      ["Open Sidebar", "Start new chat", "Open actions menu"].forEach((title) => {
        const btn = document.querySelector(`button[title="${title}"]`);
        if (btn) {
          btn.closest("div")?.remove();
        }
      });

      // Remove top-sticky bar
      const stickyBar = document.querySelector(
        ".absolute.h-16.w-full.rounded-lg.bg-stone-150\\/90.backdrop-blur-md.dark\\:bg-midnight-850\\/80"
      );
      if (stickyBar) stickyBar.remove();

      // Remove date container
      const dateParent = document.querySelector(
        ".flex.items-center > span.opacity-70.text-xs-strong + div.border-t-\\[1px\\].mx-2.border-saddle-300"
      );
      if (dateParent?.parentElement) dateParent.parentElement.remove();

      // Change font color backgrounds
      document
        .querySelectorAll(
          '[class*="font-ligatures-none"][class*="h-fit"][class*="max-w-[80%]"][class*="self-end"][class*="whitespace-pre-wrap"][class*="break-words"][class*="rounded-2xl"][class*="bg-spot-peach-300/50"][class*="px-5"][class*="py-3"][class*="dark:bg-midnight-750"][class*="text-base"]'
        )
        .forEach((el) => {
          (el as HTMLElement).style.backgroundColor = "#F2ECEC";
        });

      // Change citation button backgrounds
      document
        .querySelectorAll('button[aria-label^="Citation "]')
        .forEach((button) => {
          const label = button.getAttribute("aria-label") ?? "";
          if (/Citation \d+$/.test(label)) {
            (button as HTMLElement).style.backgroundColor = "#F2ECEC";
          }
        });

      // Remove composer container
      const composer = document.querySelector(
        '[data-testid="composer-content"]'
      );
      if (composer) {
        const container = composer.closest(".relative.max-h-full");
        if (container) container.remove();
      }

      // Remove reference block if exists
      const refBlock = document.querySelector(
        'div.flex.flex-col.gap-2.pt-1[data-copy="false"]'
      );
      if (refBlock) refBlock.remove();
    },
  });
};


  const handleTabClick = (tabName: ResponseTabsType) => {
    setActiveTab(tabName);
  };

  const { OID = "", Query = "", Engine = "" } = queryData || {};

  const aiType: AiType = AgentToAiType[Engine]; // "Copilot"
  const alias: AiAliasType = AiAlias[aiType]; // "cgp"
  const ResponseImage = `${alias}${OID}.png`; // "cgp123.png"

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
      ResponseCode: responseCode,
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
        currentPageLabel="Query Details"
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
          <p className="field-text">Engine:</p>
          <div className="value-container">
            <span>{Engine}</span>
            <CopyButton value={Engine} />
          </div>
        </div>
        <search></search>

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
        <Button onClick={() => handleScreenshot(ResponseImage)}>
          Screenshot
        </Button>
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
};

export default Copilot;
