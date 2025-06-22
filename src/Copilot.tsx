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

  // useEffect(() => {
  //   const extractAllData = async () => {
  //     await triggerExtract();
  //     await triggerExtractCitations();

  //     setExtractedTabs({
  //       html: true,
  //       markdown: true,
  //       citations: true,
  //     });
  //   };

  //   extractAllData();
  // }, []);

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

  // const triggerExtractCitations = async () => {
  //   const [tab] = await chrome.tabs.query({
  //     active: true,
  //     currentWindow: true,
  //   });

  //   chrome.scripting.executeScript(
  //     {
  //       target: { tabId: tab.id! },
  //       func: () => {
  //         const anchors: NodeListOf<HTMLAnchorElement> =
  //           document.querySelectorAll("div[data-copy='false'] a");

  // const links = Array.from(anchors).map((a) => {
  //   if (a && a?.href) {
  //     const href = a.href;
  //     const title = a.getAttribute("title");
  //     return `[${title}](${href})`;
  //   }
  // });

  //         return links.join("##NEWLINE##");
  //       },
  //     },
  //     (injectionResults) => {
  //       const result = injectionResults?.[0]?.result;
  //       setCitations(result || "No content found");
  //     }
  //   );
  // };

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
            anchors: NodeListOf<HTMLAnchorElement>
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
            "button[title*='Show'][title*='more citations']"
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
                "div[data-modal-overlay='true']"
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
            "div[data-copy='false'] a[href]"
          );
     
         const links = Array.from(inlineAnchors)
        .map((a) => {
          const href = a.href;
          const title = a.getAttribute("title") || href;
          return href ? `[${title}](${href})` : null;
        })
        .filter((link): link is string => link !== null)
        .join("##NEWLINE##");

      return links
        },
      },
      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        setCitations(result || "No content found");
      }
    );
  };

  // const triggerExtract = async () => {
  //   const [tab] = await chrome.tabs.query({
  //     active: true,
  //     currentWindow: true,
  //   });
  //   chrome.scripting.executeScript(
  //     {
  //       target: { tabId: tab.id! },
  //       func: () => {
  //         const el = document.querySelector(
  //           "main div[data-content=ai-message] div"
  //         );
  //         console.log("Element:", el);
  //         return el ? el.outerHTML : "No content found";
  //       },
  //     },
  //     (injectionResults) => {
  //       const result = injectionResults?.[0]?.result;
  //       setData({ html: result as string, text: "" });
  //     }
  //   );
  // };

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
            'div[data-tabster*="groupper"][data-content="ai-message"]'
          );
          if (!container) return "No container found";

          // Extract all inner divs with class group/ai-message-item
          const messageItems = container.querySelectorAll(
            "div.group\\/ai-message-item"
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

  const removeDiv = async (): Promise<void> => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        // Remove the header
        const header = document.querySelector(
          "main div.sticky div.absolute"
        ) as HTMLElement | null;
        header?.remove();

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
        ["Open Sidebar", "Start new chat", "Open actions menu"].forEach(
          (title) => {
            const btn = document.querySelector(`button[title="${title}"]`);
            if (btn) {
              btn.closest("div")?.remove();
            }
          }
        );

        // Remove buttons in the response container
        const responseContainer = document.querySelector(
          ".flex.flex-col.items-end.gap-3.pb-8"
        ) as HTMLElement | null;
        if (responseContainer) {
          const buttons = responseContainer.querySelectorAll("button");
          buttons.forEach((btn: HTMLButtonElement) => btn.remove());
        }

        // Hide the search box temporarily
        const searchBox = document.querySelector(
          "div.relative.mb-4 div.relative.min-h-composer"
        ) as HTMLElement | null;
        searchBox?.setAttribute("style", "display: none");

        // Remove the bottom fade
        const bottomFade = document.querySelector(
          "main div.pointer-events-none div.t-bottom-fade"
        ) as HTMLElement | null;
        bottomFade?.remove();

        // Remove the background gradient
        const bgGradient = document.querySelector(
          "main div.absolute div.bg-gradient-chat-light"
        ) as HTMLElement | null;
        bgGradient?.remove();

        // Remove the Today separator
        const todaySeparator = document.querySelector(
          "main div[data-testid=chat-page] div.items-center"
        ) as HTMLElement | null;
        todaySeparator?.setAttribute("style", "display: none");

        // Remove ratings controls
        const ratingsControls = document.querySelectorAll(
          "main div.ease-in-out"
        ) as NodeListOf<HTMLElement>;
        ratingsControls.forEach((x) => x.remove());

        // Decolorize human prompt bubble background, citations, etc.
        const elementsToGrey = document.querySelectorAll(
          "div[data-content=user-message] div, button[aria-label*=Citation], a span.inline-block, table tr th, code.font-mono"
        ) as NodeListOf<HTMLElement>;
        elementsToGrey.forEach((el) => {
          el.style.backgroundColor = "#e9e9e9";
        });

        // Turn the background color to white
        const backgroundElements = document.querySelectorAll(
          "div[data-testid=chat-page], div.sticky > div.absolute"
        ) as NodeListOf<HTMLElement>;
        backgroundElements.forEach((el) => {
          el.style.backgroundColor = "#fff";
        });

        // Neutralize table borders
        const tableBorders = document.querySelectorAll(
          "table tr th, table tr td"
        ) as NodeListOf<HTMLElement>;
        tableBorders.forEach((el) => {
          el.style.borderColor = "#e0e0e0";
        });

        //remove one more button

        const btn = document.querySelector<HTMLButtonElement>(
          "button[title*=Show][title*=more citations]"
        );
        if (btn) {
          btn.remove();
        }

        //remove citations

        const modal = document.querySelector('div[data-copy="false"]');
        if (modal) {
          const links = modal.querySelectorAll("a");
          links.forEach((link) => link.remove());
        }
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
      '[data-testid="message-item-reactions"]'
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

  const copilotStagingLinkOne = "https://aka.ms/copilot-mai-stg";
  const copilotStagingLinkTwo =
    "https://copilot.microsoft.com/?setflight=newcopilot&features=-,ncstg,respondingchatgpt-gg,citationformatupdate";

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
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Button onClick={removeDiv}>Remove Related Divs</Button>
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
