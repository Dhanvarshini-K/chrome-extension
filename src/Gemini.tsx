/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { saveOrUpdate } from "./utils";
import "./Perplexity.css";

type ExtractedData = {
  html: string;
  text: string;
};

interface GeminiProps {
  goBack?: () => void;
  goHome: () => void;
  goQueryList: () => void;
  queryData: QueryFormData | null;
  refreshQueryData: () => Promise<void>;
}

function Gemini({
  queryData,
  goHome,
  goQueryList,
  refreshQueryData,
}: GeminiProps) {
  const [data, setData] = useState<ExtractedData>({ html: "", text: "" });
  const [activeTab, setActiveTab] = useState<ResponseTabsType>(
    ResponseTabs.HTML
  );
  const [id, setId] = useState<string>("");
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");
  // const [isCitationsLoading, setIsCitationsLoading] = useState(false);
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
    if (!queryData?.Query) return;

    try {
      setIsAutomationRunning(true);

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return;

      const tabId = tab.id;
      const query = queryData.Query;

      // ✅ Step 1: Reload the tab
      await chrome.tabs.reload(tabId);
      console.log("🔄 Tab reloaded. Waiting for load...");

      // ✅ Step 2: Wait for the tab to fully load
      await new Promise<void>((resolve) => {
        const onUpdated = (
          updatedTabId: number,
          changeInfo: chrome.tabs.TabChangeInfo
        ) => {
          if (updatedTabId === tabId && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            console.log("✅ Page fully loaded");
            resolve();
          }
        };

        chrome.tabs.onUpdated.addListener(onUpdated);
      });

      await chrome.scripting.executeScript({
        target: { tabId },
        func: async (query: string) => {
          const delay = (ms: number) =>
            new Promise((res) => setTimeout(res, ms));

          const waitForElement = async (
            selector: string,
            timeout = 10000
          ): Promise<HTMLElement | null> => {
            const interval = 200;
            const maxTries = timeout / interval;
            let tries = 0;

            while (tries < maxTries) {
              const el = document.querySelector(selector) as HTMLElement | null;
              if (el) return el;
              await delay(interval);
              tries++;
            }

            return null;
          };

          const simulateUserFlow = async () => {
            // ✅ STEP 1: Wait for and click "New Chat" button
            const icon = await waitForElement(
              // '[data-test-id="side-nav-action-button-icon"]'
              '[data-test-id="expanded-button"]'
            );

            if (icon) {
              const clickable = icon.closest(
                'button, [role="button"], div'
              ) as HTMLElement | null;

              if (clickable) {
                const rect = clickable.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;

                if (isVisible) {
                  console.log("✅ Clicking New Chat button...");
                  clickable.style.outline = "2px solid red"; // debug
                  clickable.click();
                  await delay(1000);
                } else {
                  console.warn("⚠️ New Chat button is not visible.");
                }
              } else {
                console.error("❌ Clickable container for New Chat not found.");
              }
            } else {
              console.error("❌ New Chat icon not found after waiting.");
              return;
            }

            // ✅ STEP 2: Wait for input field
            const inputDiv = await waitForElement(
              'div.ql-editor.textarea.new-input-ui[contenteditable="true"]'
            );

            if (inputDiv) {
              console.log("✅ Found input field. Typing...");

              // inputDiv.innerHTML = `<p>${query}</p>`;
              const escapedQuery = query.replace(
                /\t/g,
                "&nbsp;&nbsp;&nbsp;&nbsp;"
              );
              inputDiv.innerHTML = `<p>${escapedQuery}</p>`;
              inputDiv.focus();

              const inputEvent = new InputEvent("input", {
                bubbles: true,
                cancelable: true,
                inputType: "insertText",
                data: query,
              });
              inputDiv.dispatchEvent(inputEvent);

              await delay(500);
            } else {
              console.error("❌ Input field not found after waiting.");
              return;
            }

            // ✅ STEP 3: Click send button (optional fallback)
            const sendBtn = document.querySelector(
              "button.send-button"
            ) as HTMLButtonElement | null;

            if (sendBtn && !sendBtn.disabled) {
              console.log("✅ Clicking send button...");
              sendBtn.click();
            } else {
              console.warn("⚠️ Send button not found. Sending Enter key...");
              const enterEvent = new KeyboardEvent("keydown", {
                key: "Enter",
                code: "Enter",
                bubbles: true,
                cancelable: true,
              });
              inputDiv.dispatchEvent(enterEvent);
            }
            await delay(10000);
            // ✅ STEP 4: If retry button exists, click it
            const retryBtn = document.querySelector(
              ".mdc-button.mat-mdc-button-base.retry-without-tool-button.mat-mdc-button.mat-unthemed.ng-star-inserted"
            ) as HTMLButtonElement | null;
            if (retryBtn) {
              const rect = retryBtn.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;

              if (isVisible && !retryBtn.disabled) {
                console.log("✅ Clicking Retry button...");
                retryBtn.style.outline = "2px solid green"; // debug highlight
                retryBtn.click();
                await delay(500);
              } else {
                console.warn("⚠️ Retry button found but not visible/enabled.");
              }
            } else {
              console.log("ℹ️ Retry button not found.");
            }
          };

          simulateUserFlow();
        },

        args: [query],
      });
    } catch (error: any) {
      console.error("🚨 Automation error:", error);
    } finally {
      setIsAutomationRunning(false);
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
          // Try common selectors
          const selectors = [
            // "div.conversation-container",
            "div.markdown",
            "div.ng-trigger-immersivePanelTransitions",
            ".ng-trigger.ng-trigger-immersivePanelTransitions.ng-star-inserted",
            '[data-test-id="code-editor"]',
            'div.response-container'
          ];

          let combinedHTML = "";

          selectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => {
              combinedHTML += el.outerHTML + "\n";
            });
          });

          return combinedHTML || "No content found";
        },
      },
      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        setData({ html: result as string, text: "" });
      }
    );
    
  };

  const triggerExtractCitations = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.log("entered");

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id! },
        func: () => {
          const citations = Array.from(
            document.querySelectorAll("inline-source-card a")
          );
          console.log("citations");

          const formattedCitations = citations.map((el) => {
            const a = el as HTMLAnchorElement;
            const title =
              a.querySelector(".title")?.textContent?.trim() ||
              a.textContent?.trim() ||
              "No Title";
            const href = a.href;

            console.log(title, href);
            return `[${title}](${href})`;
          });

          return formattedCitations.join("##NEWLINE##");
        },
      },

      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        console.log("result", result);
        console.log("type", typeof result);

        setCitationsData(
          typeof result === "string" ? result : "No content found"
        );
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
      const pathSegments = parsedUrl.pathname.split("/").filter(Boolean); // remove empty
      const chatId = pathSegments[pathSegments.length - 1];
      return chatId || null;
    } catch  {
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
        //Remove side bar
        const sideNav = document.querySelector("bard-sidenav");
        if (sideNav) sideNav.remove();

        //Remove MenuIcon
        document
          .querySelectorAll(".desktop-ogb-buffer")
          .forEach((el) => el.remove());

        //change query bg

        // document
        //   .querySelectorAll(".user-query-bubble-with-background")
        //   .forEach((el) => {
        //     (el as HTMLElement).style.backgroundColor = "#E9E9E9";
        //   });

        // Remove top bar
        document
          .querySelectorAll(".side-nav-menu-button.with-pill-ui")
          .forEach((el) => el.remove());

        document
          .querySelectorAll('[data-test-id="bard-mode-switcher"]')
          .forEach((el) => el.remove());

        document
          .querySelectorAll('[aria-label^="Google Account:"]')
          .forEach((el) => el.remove());

        document
          .querySelectorAll('[data-test-id="pillbox"]')
          .forEach((el) => el.remove());

        document
          .querySelectorAll('[data-test-id="overflow-container"]')
          .forEach((el) => el.remove());

        //Input container
        document
          .querySelectorAll("input-container")
          .forEach((el) => el.remove());

        // Response Options buttons
        document
          .querySelectorAll(".response-container-footer")
          .forEach((el) => el.remove());

        // Gemini logo
        document
          .querySelectorAll(".avatar-component")
          .forEach((el) => el.remove());

        // Show thinking

        document
          .querySelectorAll('[data-test-id="thoughts-header-button"]')
          .forEach((el) => el.remove());

        //Response Footer

        document
          .querySelectorAll(".response-footer")
          .forEach((el) => el.remove());

        // change text color

        // document.querySelectorAll("*").forEach((el: any) => {
        //   el.style.color = "#555";
        // });

        //link bg color

        document
          .querySelectorAll("button.button.ng-star-inserted")
          .forEach((el) => {
            (el as HTMLElement).style.backgroundColor = "#E9E9E9"; // or 'unset'
          });

        // remove conversion popup
        const promo = document.querySelector(
          "contextual-discovery-response-promotion.contextual-discovery-response-promotion"
        );
        if (promo) promo.remove();

        document
          .querySelectorAll('button[data-test-id="view-report-button"]')
          .forEach((el) => {
            (el as HTMLElement).style.backgroundColor = "#E9E9E9"; // or 'unset'
          });
        document
          .querySelectorAll(".immersive-editor-quick-actions-panel")
          .forEach((el) => el.remove());

        document
          .querySelectorAll(".action-buttons")
          .forEach((el) => el.remove());
      },
    });
  };

  const handleTabClick = async (tabName: ResponseTabsType) => {
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
      await saveOrUpdate(payload as any);
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
    await triggerExtractCitations();
  };

  console.log("citationsData", citationsData);
  console.log("active tab", activeTab);
  console.log("ResponseTabs", ResponseTabs);

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
            Unbranding
          </Button>
        </div>

        <div style={{ marginBottom: "1rem", width: "48%" }}>
          {/* <Button
            onClick={() => handleScreenshot(ResponseImage)

            }
            className="btn-screenshot"
          >
            Screenshot
          </Button> */}
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
                {citationsData && (
                  <>
                    <CopyButton value={citationsData} />
                    <pre className="pre-block">{citationsData}</pre>
                  </>
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

export default Gemini;
