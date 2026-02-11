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
import type { SelectorGroup } from "./types/copilotSelectors";

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

const M365Copilot = ({
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
  const [isAutomationRunning, setIsAutomationRunning] = useState(false);

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

          return links;
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

    const res = await fetch(chrome.runtime.getURL("copilotSelectors.json"));
    const selectorGroups: SelectorGroup[] = await res.json();

    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (groups: SelectorGroup[]) => {
        groups.forEach((group) => {
          group.selectors.forEach((item) => {
            if (!item) return;

            const hasStyle = !!group.style;

            const applyStyles = (el: HTMLElement) => {
              if (hasStyle) {
                // Style for element
                const { parent, ...ownStyles } = group.style as any;
                Object.entries(ownStyles).forEach(([key, value]) => {
                  el.style[key as any] = value as string;
                });

                // Style for parent
                if (parent && el.parentElement) {
                  Object.entries(parent).forEach(([key, value]) => {
                    (el.parentElement as HTMLElement).style[key as any] =
                      value as string;
                  });
                }
              }
            };

            if (item.multiple) {
              const elements = document.querySelectorAll(item.selector);
              elements.forEach((el) => {
                if (hasStyle) {
                  applyStyles(el as HTMLElement);
                } else if (group.removeParent) {
                  el.parentElement?.remove();
                } else {
                  el.remove();
                }
              });
            } else {
              const el = document.querySelector(item.selector);
              if (!el) return;

              if (hasStyle) {
                applyStyles(el as HTMLElement);
              } else if (group.removeParent) {
                el.parentElement?.remove();
              } else {
                el.remove();
              }
            }
          });
        });

        let removed: boolean;

        do {
          removed = false;
          const allDivs: NodeListOf<HTMLDivElement> =
            document.querySelectorAll("div");

          allDivs.forEach((div: HTMLDivElement) => {
            const isEmpty: boolean = [...div.childNodes].every(
              (node: ChildNode) => {
                return (
                  (node.nodeType === Node.TEXT_NODE &&
                    node.textContent?.trim() === "") ||
                  node.nodeType === Node.COMMENT_NODE
                );
              }
            );

            if (isEmpty) {
              div.remove();
              removed = true;
            }
          });
        } while (removed);
      },
      args: [selectorGroups],
      world: "MAIN",
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

  // const copilotStagingLinkOne =
  //   "https://copilotstaging.microsoft.com/?features=cocov2sonnetvertex,cococrit";

  // const copilotStagingLinkOne = "https://aka.ms/copilot-mai-stg";
  // const copilotStagingLinkTwo =
  //   "https://copilot.microsoft.com/?setflight=newcopilot&features=-,ncstg,respondingchatgpt-gg,citationformatupdate";

  //   const runAutomation = async () => {
  //   if (!queryData?.Query) return;

  //   try {
  //     setIsAutomationRunning(true);

  //     const [tab] = await chrome.tabs.query({
  //       active: true,
  //       currentWindow: true,
  //     });

  //     if (!tab?.id) return;

  //     const tabId = tab.id;
  //     const query = queryData.Query;

  //     // ✅ Step 1: Reload the tab
  //     await chrome.tabs.reload(tabId);
  //     console.log("🔄 Tab reloaded. Waiting for load...");

  //     // ✅ Step 2: Wait for the tab to fully load
  //     await new Promise<void>((resolve) => {
  //       const onUpdated = (
  //         updatedTabId: number,
  //         changeInfo: chrome.tabs.TabChangeInfo
  //       ) => {
  //         if (updatedTabId === tabId && changeInfo.status === "complete") {
  //           chrome.tabs.onUpdated.removeListener(onUpdated);
  //           console.log("✅ Page fully loaded");
  //           resolve();
  //         }
  //       };

  //       chrome.tabs.onUpdated.addListener(onUpdated);
  //     });

  //     // ✅ Step 3: Inject the automation script
  //     await chrome.scripting.executeScript({
  //       target: { tabId },
  //       func: (query: string) => {
  //         const delay = (ms: number) =>
  //           new Promise((res) => setTimeout(res, ms));

  //         const simulateUserFlow = async () => {
  //           const newChatBtn = document.querySelector(
  //             'button[data-testid="sidebar-new-thread"]'
  //           ) as HTMLElement | null;

  //           console.log("🔍 New chat button:", newChatBtn);

  //           if (newChatBtn) {
  //             const rect = newChatBtn.getBoundingClientRect();
  //             const isVisible = rect.width > 0 && rect.height > 0;

  //             console.log("📏 Button visibility:", isVisible);

  //             if (isVisible) {
  //               console.log("✅ Clicking New Chat button...");
  //               newChatBtn.click();
  //               await delay(1000);
  //             } else {
  //               console.warn("⚠️ New Chat button found but not visible.");
  //             }
  //           } else {
  //             console.error("❌ New Chat button not found.");
  //           }

  //           const inputDiv = document.querySelector(
  //             "#ask-input"
  //           ) as HTMLElement | null;

  //           if (inputDiv) {
  //             inputDiv.focus();
  //             const event = new InputEvent("input", {
  //               bubbles: true,
  //               cancelable: true,
  //               inputType: "insertText",
  //               data: query,
  //             });
  //             inputDiv.dispatchEvent(event);
  //             await delay(500);
  //           }

  //           const submitBtn = document.querySelector(
  //             'button[data-testid="submit-button"]'
  //           ) as HTMLButtonElement | null;

  //           if (submitBtn && !submitBtn.disabled) {
  //             submitBtn.click();
  //           }
  //         };

  //         simulateUserFlow();
  //       },
  //       args: [query],
  //     });
  //   } catch (error: any) {
  //     console.error("🚨 Automation error:", error);
  //   } finally {
  //     setIsAutomationRunning(false);
  //   }
  // };

  // const runAutomation = async () => {
  //   if (!queryData?.Query) return;

  //   try {
  //     setIsAutomationRunning(true);

  //     const [tab] = await chrome.tabs.query({
  //       active: true,
  //       currentWindow: true,
  //     });

  //     if (!tab?.id) return;
  //     const tabId = tab.id;
  //     const query = queryData.Query;

  //     // ✅ Step 1: Navigate to the Copilot staging site
  //     await chrome.tabs.update(tabId, { url: copilotStagingLinkOne });
  //     console.log("🌐 Navigating to Copilot staging...");

  //     // ✅ Step 2: Wait for the tab to fully load
  //     await new Promise<void>((resolve) => {
  //       const onUpdated = (
  //         updatedTabId: number,
  //         changeInfo: chrome.tabs.TabChangeInfo
  //       ) => {
  //         if (updatedTabId === tabId && changeInfo.status === "complete") {
  //           chrome.tabs.onUpdated.removeListener(onUpdated);
  //           console.log("✅ Page fully loaded");
  //           resolve();
  //         }
  //       };

  //       chrome.tabs.onUpdated.addListener(onUpdated);
  //     });

  //     // ✅ Step 3: Inject the automation script
  //     await chrome.scripting.executeScript({
  //       target: { tabId },
  //       func: (query: string) => {
  //         const delay = (ms: number) =>
  //           new Promise((res) => setTimeout(res, ms));

  //         const simulateUserFlow = async () => {
  //           const newChatBtn = document.querySelector(
  //             'button[data-testid="sidebar-new-thread"]'
  //           ) as HTMLElement | null;

  //           if (newChatBtn) {
  //             const rect = newChatBtn.getBoundingClientRect();
  //             const isVisible = rect.width > 0 && rect.height > 0;

  //             if (isVisible) {
  //               console.log("✅ Clicking New Chat button...");
  //               newChatBtn.click();
  //               await delay(1000);
  //             }
  //           }

  //           const inputDiv = document.querySelector(
  //             "#ask-input"
  //           ) as HTMLElement | null;

  //           if (inputDiv) {
  //             inputDiv.focus();

  //             const inputEvent = new InputEvent("input", {
  //               bubbles: true,
  //               cancelable: true,
  //               inputType: "insertText",
  //               data: query,
  //             });

  //             inputDiv.textContent = query;
  //             inputDiv.dispatchEvent(inputEvent);
  //             await delay(500);
  //           }

  //           const submitBtn = document.querySelector(
  //             'button[data-testid="submit-button"]'
  //           ) as HTMLButtonElement | null;

  //           if (submitBtn && !submitBtn.disabled) {
  //             console.log("🚀 Clicking Submit button...");
  //             submitBtn.click();
  //           }
  //         };

  //         simulateUserFlow();
  //       },
  //       args: [query],
  //     });
  //   } catch (error: any) {
  //     console.error("🚨 Automation error:", error);
  //   } finally {
  //     setIsAutomationRunning(false);
  //   }
  // };

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

      // Step 1: Navigate to the Copilot staging site
      // await chrome.tabs.update(tabId, { url: copilotStagingLinkOne });
      // console.log("🌐 Navigating to Copilot staging...");

      // Step 2: Wait for page to fully load
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

      // Step 3: Inject script using your provided selectors
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (query: string) => {
          const delay = (ms: number) =>
            new Promise((res) => setTimeout(res, ms));

          const simulateUserFlow = async () => {
            const newChatBtn = document.querySelector(
              'button[title="Start new chat"]'
            ) as HTMLButtonElement | null;

            if (newChatBtn) {
              const rect = newChatBtn.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;

              if (isVisible) {
                console.log("✅ Clicking New Chat button...");
                newChatBtn.click();
                await delay(1000);
              }
            }

            console.log("query", query);

            await delay(1000);
            const inputDiv = document.querySelector(
              'textarea#userInput[data-testid="composer-input"]'
            ) as HTMLTextAreaElement | null;

            console.log("input div", inputDiv);

            if (inputDiv) {
              inputDiv.focus();

              // ✅ Use the native setter to update the value — this is what React listens to
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                "value"
              )?.set;

              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(inputDiv, query); // ✅ Set the value correctly
              } else {
                console.error("Could not get native value setter.");
              }

              // ✅ Dispatch a plain 'input' event to trigger React’s change listener
              const event = new Event("input", {
                bubbles: true,
              });

              inputDiv.dispatchEvent(event);
              await delay(500);
            }

            // Try finding the submit/send button
            const submitBtn = document.querySelector(
              'button[data-testid="submit-button"]'
            ) as HTMLButtonElement | null;

            if (submitBtn && !submitBtn.disabled) {
              console.log("🚀 Clicking Submit button...");
              submitBtn.click();
            } else {
              // Optionally simulate "Enter" key press if no button
              // textarea.dispatchEvent(
              //   new KeyboardEvent("keydown", {
              //     bubbles: true,
              //     cancelable: true,
              //     key: "Enter",
              //     code: "Enter",
              //   })
              // );
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

        {/* <div>
          <p className="field-text">Link 1:</p>
          <div className="value-container">
            <span>{copilotStagingLinkOne}</span>
            <CopyButton value={copilotStagingLinkOne} />
          </div>
        </div> */}
        {/* <div>
          <p className="field-text">Link 2:</p>
          <div className="value-container">
            <span className="pre-block">{copilotStagingLinkTwo}</span>
            <CopyButton value={copilotStagingLinkTwo} />
          </div>
        </div>  */}
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
        // <Button buttonText="Start Extract" onClick={startExtract} />
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
};

export default M365Copilot;
