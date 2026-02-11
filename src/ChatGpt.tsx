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
import { handleScreenshot } from "./utils/screenshotUtils";
import { saveOrUpdate } from "./utils";
import "./Perplexity.css";
import { extractIdFromPath } from "./helpers/chatgpt/extractId";

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

function ChatGpt({
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

      // ✅ Step 3: Inject the automation script
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (query: string) => {
          const delay = (ms: number) =>
            new Promise((res) => setTimeout(res, ms));

          const simulateUserFlow = async () => {
            const newChatBtn = document.querySelector(
              'a[data-testid="create-new-chat-button"]'
            ) as HTMLElement | null;

            console.log("🔍 New chat button:", newChatBtn);

            if (newChatBtn) {
              const rect = newChatBtn.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;

              console.log("📏 Button visibility:", isVisible);

              if (isVisible) {
                console.log("✅ Clicking New Chat button...");
                newChatBtn.click();
                await delay(1000);
              } else {
                console.warn("⚠️ New Chat button found but not visible.");
              }
            } else {
              console.error("❌ New Chat button not found.");
            }

            console.log("comlete new chat function");

            await delay(1000); // Give time for the menu to appear

     
            async function clickComposerPlusAndWaitForPopup() {
              const plusButtonSelector =
                'button[data-testid="composer-plus-btn"]';
              const popupSelector = 'div[role="menu"]'; // adjust this if your popup uses a different role

              const plusButton = document.querySelector(
                plusButtonSelector
              ) as HTMLElement | null;

              if (!plusButton) {
                console.log("[Automation] ❌ Plus button not found");
                return false;
              }

              // Try full synthetic interaction
              plusButton.dispatchEvent(
                new PointerEvent("pointerdown", { bubbles: true })
              );
              plusButton.dispatchEvent(
                new PointerEvent("pointerup", { bubbles: true })
              );
              plusButton.click();
              console.log(
                "[Automation] ✅ Triggered pointer and click events on plus button"
              );

              // Wait for popup to open
              let tries = 0;
              while (tries < 20) {
                const popup = document.querySelector(popupSelector);
                if (popup && popup.getAttribute("data-state") === "open") {
                  console.log("[Automation] ✅ Popup is open");
                  return true;
                }
                await delay(200);
                tries++;
              }

              // Fallback logging
              const popup = document.querySelector(popupSelector);
              if (popup) {
                console.log(
                  "[Automation] ⚠️ Popup found but state:",
                  popup.getAttribute("data-state")
                );
                console.log(
                  "[Automation] CSS display:",
                  getComputedStyle(popup).display
                );
              } else {
                console.log("[Automation] ❌ Popup not found in DOM");
              }

              return false;
            }

            const plusButton = await clickComposerPlusAndWaitForPopup();
            if (!plusButton) {
              console.log(
                "[Automation] Failed to open model selector dropdown, aborting"
              );
              return;
            }
            await delay(1000);

            const menuItems = Array.from(
              document.querySelectorAll('[role="menuitemradio"]')
            );

            console.log("menu items", menuItems);

            const deepResearchItem = menuItems.find((item) => {
              console.log("item", item);
              const truncateDiv = item.querySelector("div.truncate");
              console.log("truncate", truncateDiv);
              return truncateDiv?.textContent?.trim() === "Deep research";
            }) as HTMLElement | undefined;

            console.log("deepResearchItem", deepResearchItem);
            if (deepResearchItem) {
              console.log("✅ Found 'Deep research', clicking...");
              deepResearchItem.click();
            } else {
              console.error("❌ 'Deep research' item not found.");
            }

            const inputDiv = document.querySelector(
              "div#prompt-textarea"
            ) as HTMLElement | null;

            if (inputDiv) {
              inputDiv.focus();
              const escapedQuery = query.replace(
                /\t/g,
                "&nbsp;&nbsp;&nbsp;&nbsp;"
              );
              inputDiv.innerHTML = `<p>${escapedQuery}</p>`;
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
              'button[data-testid="send-button"]'
            ) as HTMLButtonElement | null;

            if (submitBtn && !submitBtn.disabled) {
              submitBtn.click();
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


  const triggerExtractResponse = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id! },
        func: () => {
          const el = document.querySelector(
            'article[data-testid="conversation-turn-4"][data-turn="assistant"]'
          );
          const targetDiv = el?.querySelector(
            "div.group\\/turn-messages"
          ) as HTMLDivElement;
          const response = targetDiv.querySelector("div") as HTMLDivElement;
          console.log("response outerhtml", response.outerHTML);
          return response ? response.outerHTML : "No Content found";
        },
      },
      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        console.log("result", result);
        setData({ html: result as string, text: "" });
      }
    );
  };

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
        setCitationsData(result || "No content found");
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

    console.log("html and markdown", htmlSingleLine, markdownSingleLine);

    setHtml(htmlSingleLine);
    setMarkdown(markdownSingleLine);
  };

  useEffect(() => {
    if (data.html) {
      renderOutput();
    }
  }, [data.html]);

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
        function safeRemove(el: any) {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }
        // aria-label="Edit in canvas"
        document
          .querySelectorAll('[data-testid="copy-turn-action-button"]')
          .forEach((btn) => {
            safeRemove(btn.parentElement?.parentElement);
          });
   
        safeRemove(document.querySelector('[data-testid="nav-list-widget"]'));

        safeRemove(
          document.querySelector("#sidebar-header")?.parentElement
            ?.parentElement
        );

        const targetDivs = [".group-footnote"];

        const targetDivs2 = [
          "#conversation-header-actions",
          "#thread-bottom",
          "#page-header",
          // "#thread-bottom-container",
          "#sidebar-header",
          "#sidebar",
          ".draggable",
        ];
        targetDivs2.forEach((selector) => {
          const divs = document.querySelectorAll(selector);
          divs.forEach((div) => div.remove());
        });

        targetDivs.forEach((selector) => {
          const divs = document.querySelectorAll(selector);
          divs.forEach((div) => div.remove());
        });

        const likeIcon = document.querySelector(".mt-3.w-full.empty\\:hidden");
        if (likeIcon) {
          likeIcon.remove();
        }

        const reactionsDiv = document.querySelector(
          "button[data-testid='copy-turn-action-button']"
        );
        if (reactionsDiv) reactionsDiv?.parentElement?.parentElement?.remove();

        const downArrow = document.querySelector(
          "svg.icon.text-token-text-primary"
        );
        if (downArrow) downArrow?.parentElement?.parentElement?.remove();
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
      await triggerExtractResponse();
      await triggerExtractCitations();
      setTimeout(() => {
        savePayload();
      }, 1000);
    } else {
      savePayload();
    }
  };

  const startExtract = async () => {
    setIsAutomationRunning(false);
    console.log("entered");
    await triggerExtractResponse();
    console.log("exit");
    await triggerExtractCitations();
  };

  console.log("active tab", activeTab);
  console.log("response tab", ResponseTabs);
  console.log("html", html);

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

        <div className="field-container">
          <span className="field-text">Response Image Name:</span>
          <div className="value-container">
            <span className="query-field">
              {ResponseImage.replace(/\.png$/, "")}
            </span>
            <CopyButton value={ResponseImage.replace(/\.png$/, "")} />
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
        <div
          className="value-container"
          style={{ flexDirection: "column", gap: "1rem" }}
        >
          <div style={{ width: "47%" }}>
            <Button
              onClick={runAutomation}
              buttonText="Run Automation"
              className="btn-run-automation"
              style={{ width: "100%" }}
              disabled={isAutomationRunning}
            />
          </div>
          <div style={{ width: "48%" }}>
            <Button
              buttonText="Start Extract"
              onClick={startExtract}
              className="btn-start-extract"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
export default ChatGpt;
