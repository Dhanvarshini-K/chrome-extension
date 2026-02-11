/* eslint-disable @typescript-eslint/no-explicit-any */
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
    ResponseTabs.HTML,
  );
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");

  const [extractedTabs, setExtractedTabs] = useState<
    Record<ResponseTabsType, boolean>
  >({
    html: false,
    markdown: false,
    citations: false,
  });

  const [id, setId] = useState<string>("");

  const tabs: ResponseTabsType[] = Object.values(ResponseTabs);

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
  useEffect(() => {
    extractIdFromUrl();
  }, []);

  useEffect(() => {
    if (data.html) {
      renderOutput();
    }
  }, [data.html]);

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
        func: async () => {
          const delay = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));

          const getMarkdownLinks = (
            anchors: NodeListOf<HTMLAnchorElement>,
          ): string => {
            return Array.from(anchors)
              .map((a) => {
                const href = a.href;

                // Get the second <div> inside the <a> — typically the article title
                const divs = a.querySelectorAll("div");
                const title = divs[2]?.textContent?.trim() || href;

                return href ? `[${title}](${href})` : null;
              })
              .filter((link): link is string => link !== null)
              .join("##NEWLINE##");
          };

          const moreBtn = document.querySelector<HTMLButtonElement>(
            "button[title*='Show'][title*='more citations']",
          );

          if (moreBtn) {
            moreBtn.click();
            await delay(500); // wait for modal animation

            // Wait up to 2 seconds for the modal to load
            const maxWait = 2000;
            const interval = 100;
            let elapsed = 0;
            let modal: HTMLElement | null = null;

            while (elapsed < maxWait) {
              modal = document.querySelector<HTMLElement>(
                "div[data-modal-overlay='true']",
              );
              if (modal) break;
              await delay(interval);
              elapsed += interval;
            }

            if (modal) {
              const modalAnchors =
                modal.querySelectorAll<HTMLAnchorElement>("a[href]");
              return getMarkdownLinks(modalAnchors);
            }
          }

          // Fallback: Extract from inline citation section
          const inlineAnchors = document.querySelectorAll<HTMLAnchorElement>(
            "div[data-copy='false'] a[href]",
          );

          const links = Array.from(inlineAnchors)
            .map((a) => {
              const href = a.href;
              const title = a.getAttribute("title") || href;
              return href ? `[${title}](${href})` : null;
            })
            .filter((link): link is string => link !== null)
            .join("##NEWLINE##");

          return links;
        },
      },
      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        setCitations(result || "No content found");
      },
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
          // Find the outer container first
          const container = document.querySelector(
            'div[data-tabster*="groupper"][data-content="ai-message"]',
          );
          if (!container) return "No container found";

          // Extract all inner divs with class group/ai-message-item
          const messageItems = container.querySelectorAll(
            "div.group\\/ai-message-item",
          );

          // Join their outerHTML
          const html = Array.from(messageItems)
            .map((el) => el.outerHTML)
            .join("\n");

          return html || "No message items found";
        },
      },
      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        setData({ html: result as string, text: "" });
      },
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
        console.log("data.html", data.html);
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
    
        console.log("markdownSingleLine", markdownSingleLine);
        console.log("htmlSingleLine", htmlSingleLine);
    
        setHtml(htmlSingleLine);
        setMarkdown(markdownSingleLine);
      };




  useEffect(() => {
    console.log("html", html);
    console.log("markdown", markdown);
  });

  const handleTabClick = (tabName: ResponseTabsType) => {
    setActiveTab(tabName);
  };

  const { OID = "", Query = "", Engine = "" } = queryData || {};

  const aiType: AiType = AgentToAiType[Engine]; // "Copilot"
  const alias: AiAliasType = AiAlias[aiType]; // "cgp"
  const ResponseImage = `${alias}${OID}.png`; // "cgp123.png"

  function removeDiv() {
    const selectorGroups = [
      {
        name: "header",

        selectors: [
          { selector: ".pointer-events-none.sticky", multiple: false },
        ],

        removeParent: false,
      },

      {
        name: "Share Buttons",

        selectors: [
          {
            selector: "button[title='Share message and prompt']",
            multiple: true,
          },
        ],

        removeParent: false,
      },

      {
        name: "Message Reactions",

        selectors: [
          {
            selector: "[data-testid='message-item-reactions']",
            multiple: true,
          },
        ],

        removeParent: false,
      },

      {
        name: "Date Divider",

        selectors: [
          { selector: "[data-testid='date-divider']", multiple: true },
        ],

        removeParent: false,
      },

      {
        name: "Citation Cards",

        selectors: [
          { selector: "[data-testid='citation-cards-row']", multiple: true },
        ],

        removeParent: false,
      },

      {
        name: "Composer Container",

        selectors: [
          {
            selector: ".relative.max-h-full.w-expanded-composer",
            multiple: false,
          },
        ],

        removeParent: false,
      },

      {
        name: "Scroll to Top Button",

        selectors: [
          {
            selector: ".relative.flex.items-center.gap-x-1\\.5",
            multiple: true,
          },

          {
            selector: "span.relative.rounded-full.bg-white\\/40",
            multiple: true,
          },
        ],

        removeParent: false,
      },

      {
        name: "Scroll to Bottom Button",

        selectors: [
          {
            selector: "[data-testid='scroll-to-bottom-button']",
            multiple: true,
          },
        ],

        removeParent: true,
      },

      {
        name: "Open Sidebar Button",

        selectors: [
          { selector: "button[aria-label='Open sidebar']", multiple: true },
        ],

        removeParent: false,
      },

      {
        name: "Sidebar Container",

        selectors: [
          { selector: ".w-sidebar", multiple: false },

          {
            selector: "[data-testid='sidebar-settings-button']",
            multiple: false,
          },
        ],

        removeParent: true,
      },

      {
        name: "Sidebar Navigation",

        selectors: [
          { selector: "[data-testid='sidebar-container']", multiple: false },

          {
            selector: "[data-testid='sidebar-copilot-brand-button']",
            multiple: false,
          },

          {
            selector: "[data-testid='sidebar-new-conversation-button']",
            multiple: false,
          },
        ],

        removeParent: true,
      },

      {
        name: "Sidebar Width Container",

        selectors: [
          {
            selector: "div.absolute.h-full.w-0[style*='width: 52px']",
            multiple: false,
          },

          { selector: "div.md\\:w-\\[52px\\]", multiple: false },
        ],

        removeParent: false,
      },

      {
        name: "User Messages Background",

        selectors: [
          { selector: "[data-content='user-message']", multiple: true },
        ],

        removeParent: false,

        style: {
          backgroundColor: "#F0F0F0",
        },
      },

      {
        name: "Main Background",

        selectors: [{ selector: "[data-testid='chat-page']", multiple: false }],

        removeParent: false,

        style: {
          backgroundColor: "#FFFFFF",
        },
      },

      {
        name: "Body Background",

        selectors: [{ selector: "body", multiple: false }],

        removeParent: false,

        style: {
          backgroundColor: "#FFFFFF",
        },
      },
    ]; // Core logic to apply styles or remove elements

    selectorGroups.forEach((group) => {
      group.selectors.forEach((item) => {
        if (!item) return;

        const hasStyle = !!group.style;

        const applyStyles = (el: any) => {
          if (hasStyle) {
            const { parent, ...ownStyles } = group.style as any;

            Object.entries(ownStyles).forEach(([key, value]) => {
              el.style[key] = value;
            });

            if (parent && el.parentElement) {
              Object.entries(parent).forEach(([key, value]) => {
                el.parentElement.style[key] = value;
              });
            }
          }
        };

        if (item.multiple) {
          const elements = document.querySelectorAll(item.selector);

          console.log(
            `Found ${elements.length} elements for: ${item.selector}`,
          );

          elements.forEach((el) => {
            if (hasStyle) {
              applyStyles(el);
            } else if (group.removeParent && el.parentElement) {
              el.parentElement.remove();
            } else {
              el.remove();
            }
          });
        } else {
          const el = document.querySelector(item.selector);

          if (!el) {
            console.log(`No element found for: ${item.selector}`);

            return;
          }

          if (hasStyle) {
            applyStyles(el);
          } else if (group.removeParent && el.parentElement) {
            el.parentElement.remove();
          } else {
            el.remove();
          }
        }
      });
    }); // Remove empty <div>s

    let removed;

    let iterations = 0;

    do {
      removed = false;

      const allDivs = document.querySelectorAll("div");

      allDivs.forEach((div) => {
        const isEmpty = [...div.childNodes].every((node) => {
          return (
            (node.nodeType === Node.TEXT_NODE &&
              node.textContent?.trim() === "" ) ||
            node.nodeType === Node.COMMENT_NODE
          );
        });

        if (isEmpty) {
          div.remove();

          removed = true;
        }
      });

      iterations++;

      if (iterations > 100) break; // Safety limit
    } while (removed);

    console.log("Cleanup complete");

    return "Cleanup complete";
  }


  const savePayload = async () => {
    const responseText = markdown || "";
    const responseHTML = html || "";
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

  const removeReactionsFromPage = () => {
    const elements = document.querySelectorAll(
      '[data-testid="message-item-reactions"]',
    );
    elements.forEach((el) => el.remove());
  };
  const startExtract = async () => {
    // Run the DOM removal in the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: removeReactionsFromPage,
      });
    }

    await extractIdFromUrl();
    await triggerExtract();
    await triggerExtractCitations();

    setExtractedTabs({
      html: true,
      markdown: true,
      citations: true,
    });
  };

  // const copilotStagingLinkOne = "https://aka.ms/copilot-mai-stg";
  // const copilotStagingLinkTwo =
  //   "https://copilot.microsoft.com/?setflight=newcopilot&features=-,ncstg,respondingchatgpt-gg,citationformatupdate";

  const runRemoveDivInPage = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) return;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: removeDiv, // 👈 injected into page
      world: "MAIN",
    });
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
        {/* 
        <div>
          <p className="field-text">Link 1:</p>
          <div className="value-container">
            <span>{copilotStagingLinkOne}</span>
            <CopyButton value={copilotStagingLinkOne} />
          </div>
        </div>
        <div>
          <p className="field-text">Link 2:</p>
          <div className="value-container">
            <span className="pre-block">{copilotStagingLinkTwo}</span>
            <CopyButton value={copilotStagingLinkTwo} />
          </div>
        </div> */}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Button onClick={runRemoveDivInPage}>Remove Related Divs</Button>
        </div>

        <div style={{ marginBottom: "1rem", width: "175px" }}>
          <Button onClick={() => handleScreenshot(ResponseImage)}>
            Screenshot
          </Button>
        </div>
      </div>
      {html && markdown ? (
        <>
          <div className="tab-buttons">
            {tabs.map((tab) => (
              <Button
                key={tab}
                className={`tab-button ${
                  extractedTabs[tab] ? "extracted" : ""
                }`}
                onClick={() => handleTabClick(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === ResponseTabs.HTML && html && (
              <div>
                <CopyButton value={html} />
                <pre className="pre-block">{html}</pre>
              </div>
            )}
            {activeTab === ResponseTabs.MARKDOWN && markdown && (
              <div>
                <CopyButton value={markdown} />
                <pre className="pre-block">{markdown}</pre>
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
        </>
      ) : (
        <Button buttonText="Start Extract" onClick={startExtract} />
      )}
    </div>
  );
};

export default Copilot;
