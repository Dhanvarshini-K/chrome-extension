// * eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import TurnDown from "turndown";
import Button from "./components/Button/Button";
import CopyButton from "./components/CopyButton/CopyButton";
import Breadcrumbs from "./components/Breadcrumbs/Breadcrumbs";
import {
  AgentToAiType,
  AiAlias,
  ResponseTabs,
  type AiAliasType,
  type AiType,
  type QueryFormData,
  type ResponseTabsType,
} from "./types";
import { handleScreenshot } from "./utils/screenshotUtils";
import { saveOrUpdate } from "./utils";
import "./Perplexity.css";
import { FaSpinner } from "react-icons/fa";

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

function Perplexity({
  queryData,
  goHome,
  goQueryList,
  refreshQueryData,
}: PerplexityProps) {
  const [data, setData] = useState<ExtractedData>({ html: "", text: "" });
  const [activeTab, setActiveTab] = useState<ResponseTabsType>(
    ResponseTabs.HTML
  );
  const [id, setId] = useState<string>("");
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [isCitationsLoading, setIsCitationsLoading] = useState(false);
  const [isAutomationRunning, setIsAutomationRunning] = useState(false);

  const [citationsData, setCitationsData] = useState("");
  const [extractedTabs, setExtractedTabs] = useState<
    Record<ResponseTabsType, boolean>
  >({
    html: false,
    markdown: false,
    citations: false,
  });

  const { OID = "", Query = "", Engine = "" } = queryData || {};

  useEffect(() => {
    if (OID) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (OID) => {
              localStorage.setItem("OID", OID);
            },
            args: [OID],
          });
        }
      });
    }
  }, [OID]);

  const runAutomation = async () => {
    if (queryData?.Query) {
      try {
        setIsAutomationRunning(true);
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab?.id) {
          const query = queryData.Query;
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (query: string) => {
              const delay = (ms: number) =>
                new Promise((res) => setTimeout(res, ms));
              const simulateUserFlow = async () => {
                const newChatBtn = document.querySelector(
                  'button[class*="bg-offsetPlus"][class*="dark:bg-offsetPlusDark"]'
                ) as HTMLElement;
                if (newChatBtn) {
                  newChatBtn.click();
                  await delay(1000);
                }

                const inputDiv = document.querySelector(
                  "#ask-input"
                ) as HTMLElement | null;

                if (inputDiv) {
                  inputDiv.focus();
                  const event = new InputEvent("input", {
                    bubbles: true,
                    cancelable: true,
                    inputType: "insertText",
                    data: query,
                  });
                  inputDiv.dispatchEvent(event);
                  await delay(500);
                }

                const submitBtn = document.querySelector(
                  'button[data-testid="submit-button"]'
                ) as HTMLButtonElement;

                if (submitBtn && !submitBtn.disabled) {
                  submitBtn.click();
                }
              };
              simulateUserFlow();
            },
            args: [query],
          });
        }
      } catch (error: any) {
        console.error("Automation error:", error);
      }
    }
  };

  const injectScript = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const script = document.createElement("script");
          script.src = chrome.runtime.getURL("inject.js");
          script.onload = () => script.remove();
          document.documentElement.appendChild(script);
        },
      });
    }
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

    setHtml(htmlSingleLine);
    setMarkdown(markdownSingleLine);
  };
  useEffect(() => {
    if (data.html) {
      renderOutput();
    }
  }, [data.html]);

  function getChatId(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      const lastSegment = parsedUrl.pathname.split("/").pop() || "";
      const parts = lastSegment.split("-");
      const possibleId = parts[parts.length - 1];
      return possibleId ? possibleId : null;
    } catch (e) {
      return null;
    }
  }

  useEffect(() => {
    let currentUrl = "";

    const interval = setInterval(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const newUrl = tab?.url || "";

      if (newUrl !== currentUrl) {
        currentUrl = newUrl;
        const chatId = getChatId(newUrl);
        if (chatId) {
          setId(chatId);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setExtractedTabs({
      html: html !== "No content found" ? true : false,
      markdown: markdown !== "No content found" ? true : false,
      citations: citationsData !== "" ? true : false,
    });
  }, [html, markdown, citationsData]);

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "EXTRACTED_HTML") {
        setData({ html: message.html, text: message.text });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const removeDiv = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        const answerTab = document.querySelector(
          "button[data-testid='answer-mode-tabs-tab-search']"
        ) as HTMLButtonElement;

        if (answerTab) {
          answerTab.click();
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

        const ariaLabelsToRemove = [
          "Not helpful",
          "Helpful",
          "Copy",
          "Pro Search",
        ];
        ariaLabelsToRemove.forEach((label) => {
          const btn = document.querySelector(`button[aria-label="${label}"]`);
          if (btn) {
            btn.remove();
          }
        });

        // Remove <div> that contains <svg class="tabler-icon tabler-icon-dots">
        document.querySelectorAll('svg.tabler-icon.tabler-icon-dots').forEach((svg) => {
          const parentDiv = svg.closest('div');
            if (parentDiv) {
              parentDiv.remove();
            }
          });

        document.querySelectorAll("*").forEach((el: any) => {
          el.style.color = "#555";
        });

        document
  .querySelectorAll<HTMLElement>('body div[class*="bg-"], body button[class*="bg-"]')
  .forEach((el) => {
    const isDiv = el.tagName === "DIV";
    const hasCodeWrapper = el.className.includes("codeWrapper");
    const isCodeLanguageIndicator = el.getAttribute("data-testid") === "code-language-indicator";

    // ❌ Skip if it's a <div> and matches exclusion criteria
    if (isDiv && (hasCodeWrapper || isCodeLanguageIndicator)) return;

    const bg = getComputedStyle(el).backgroundColor;
    const isTransparent = bg === "rgba(0, 0, 0, 0)" || bg === "transparent";

    el.className = el.className
      .split(" ")
      .filter((cls) => !cls.startsWith("bg-") && !cls.includes(":bg-"))
      .join(" ");

    if (!isTransparent) {
      el.style.backgroundColor = "#fff";
    }
  });

        //Removed dots

        const dotsIcon = document.querySelector(
          ".tabler-icon.tabler-icon-dots"
        ) as HTMLElement | null;
        dotsIcon?.remove();

         const repeatIcon = document.querySelector(
          ".tabler-icon.tabler-icon-repeat"
        ) as HTMLElement | null;
        if(repeatIcon) repeatIcon?.remove();

          const shareIcon = document.querySelector(
          ".tabler-icon.tabler-icon-share-3"
        ) as HTMLElement | null;
        if(shareIcon) shareIcon?.remove();

        [
          ...document.querySelectorAll("div.-mx-sm.gap-xs.relative.flex"),
          ...document.querySelectorAll("div.gap-sm.grid.grid-cols-4.md\\:px-0"),
        ].forEach((el) => el.remove());

        const relatedContainer =  document.querySelector(".animate-in.fade-in.duration-100.ease-out.border-borderMain\\/50.ring-borderMain\\/50.divide-borderMain\\/50.dark\\:divide-borderMainDark\\/50.dark\\:ring-borderMainDark\\/50.dark\\:border-borderMainDark\\/50.bg-transparent");
        if(relatedContainer) {
          relatedContainer.remove();
        }
      },
    });
  };

  const handleTabClick = async (tabName: ResponseTabsType) => {
    if (tabName === ResponseTabs.CITATIONS) {
      setIsCitationsLoading(true);
      await injectScript();

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // 👇 Click the "Sources" tab before listening
            const sourcesTab = document.querySelector(
              "button[data-testid='answer-mode-tabs-tab-sources']"
            ) as HTMLButtonElement;

            if (sourcesTab) {
              sourcesTab.click();
            }

            window.addEventListener("message", (event) => {
              console.log("event", event);
              if (event.source !== window) return;

              if (event.data?.type === "CITATIONS_FOUND") {
                const markdown = event.data.citations
                  .map((page: any) => `[${page.title}](${page.url})`)
                  .join("##NEWLINE##");

                console.log("markdown", markdown);
                chrome.runtime.sendMessage({
                  type: "SAVE_CITATIONS",
                  citations: event.data.citations,
                  OID: event.data.OID,
                });
              }
            });
          },
        });

        const storageKey = `citations_${OID}`;
        let attempts = 0;
        const maxAttempts = 5;

        const checkCitations = () => {
          chrome.storage.local.get([storageKey], (result) => {
            const citations = result[storageKey];
            if (citations && citations.length) {
              const markdown = citations
                .map((page: any) => `[${page.title}](${page.url})`)
                .join("##NEWLINE##");

              setCitationsData(markdown);
              setIsCitationsLoading(false);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkCitations, 1000);
            } else {
              setIsCitationsLoading(false); // Timeout fallback
              setCitationsData("No citations found.");
            }
          });
        };

        checkCitations();
      }
    }

    setActiveTab(tabName);
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

  const tabs: ResponseTabsType[] = Object.values(ResponseTabs);

  const aiType: AiType = AgentToAiType[Engine]; // "chatgpt"
  const alias: AiAliasType = AiAlias[aiType]; // "cgp"
  const ResponseImage = `${alias}${OID}.png`; // "cgp123.png"

  const savePayload = async () => {
    const responseText = markdown || "";
    const responseHTML = html || "";
    const sources =
      citationsData.includes("No content found") &&
      !citationsData.startsWith("[")
        ? ""
        : citationsData;
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

  const startExtract = async () => {
    setIsAutomationRunning(false);
    await triggerExtract();
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

      <div className="field-value-container">
        <div className="field-container">
          <span className="field-text">Query ID:</span>
          <div className="value-container">
            <span>{OID}</span>
            <CopyButton value={OID} />
          </div>
        </div>

        <div className="field-container">
          <span className="field-text">Engine:</span>
          <div className="value-container">
            <span>{Engine}</span>
            <CopyButton value={Engine} />
          </div>
        </div>

        <div className="field-container">
          <span className="field-text">Query:</span>
          <div className="value-container">
            <span className="query-field">{Query}</span>
            <CopyButton value={Query} />
          </div>
        </div>

        <div className="field-container">
          <span className="field-text">Chat ID:</span>
          {data.html !== "" ? (
            <div className="value-container">
              <span>{id}</span>
              <CopyButton value={id} />
            </div>
          ) : (
            <span>Please enter a prompt to see the Chat ID.</span>
          )}
        </div>

        <div className="field-container">
          <span className="field-text">Date:</span>
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
      <div className="value-container">
        <div style={{ marginBottom: "1rem" }}>
          <Button onClick={removeDiv} className="btn-remove-divs">
            Remove Related Divs
          </Button>
        </div>

        <div style={{ marginBottom: "1rem", width: "48%" }}>
          <Button
            onClick={() => handleScreenshot(ResponseImage)}
            className="btn-screenshot"
          >
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
            {activeTab === ResponseTabs.CITATIONS && (
              <div>
                {isCitationsLoading ? (
                  <div className="loader">
                    <FaSpinner className="spinner" />
                  </div>
                ) : (
                  citationsData && (
                    <>
                      <CopyButton value={citationsData} />
                      <pre className="pre-block">{citationsData}</pre>
                    </>
                  )
                )}
              </div>
            )}
          </div>

          <div className="save-extract-buttons-container">
            <Button
              onClick={handleSave}
              disabled={!extractedTabs.html || !extractedTabs.markdown}
            >
              Save
            </Button>
          </div>
        </>
      ) : (
        <div className="value-container">
          <div style={{ width: "47%" }}>
            <Button
              onClick={runAutomation}
              buttonText={"Run Automation"}
              style={{ marginBottom: "1rem" }}
              className="btn-run-automation"
              disabled={isAutomationRunning}
            />
          </div>
          <div style={{ width: "48%" }}>
            <Button
              buttonText="Start Extract"
              onClick={startExtract}
              style={{ marginBottom: "1rem", width: "45%" }}
              className="btn-start-extract"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Perplexity;
