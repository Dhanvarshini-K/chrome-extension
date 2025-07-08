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
import { extractIdFromPathForClaude } from "./helpers/chatgpt/extractId";

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

function Claude({
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
  //   const [isCitationsLoading, setIsCitationsLoading] = useState(false);
  const [isAutomationRunning, setIsAutomationRunning] = useState(false);
  const [mode, setMode] = useState("");

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

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId !== undefined) {
        chrome.scripting.executeScript(
          {
            target: { tabId },
            func: () => {
              const btn = document.querySelector(
                'button[data-testid="model-selector-dropdown"]'
              );
              if (btn) {
                const text = btn.textContent?.trim();
                if (text === "Sonnet 4" || text === "Opus 4") {
                  return text;
                }
              }
              return null;
            },
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError.message);
              alert("Mode Settings is not matched , Please verify your mode");
              return;
            }
            const resultText = results?.[0]?.result;
            if (resultText) {
              console.log("Found mode?", resultText);
              setMode(resultText);
            }
          }
        );
      }
    });
  }, []);

  const runAutomation = async () => {
    if (mode) {
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
                  const sidebar = document.querySelector(
                    'button[aria-label="Sidebar"]'
                  ) as HTMLButtonElement;
                  if (sidebar) {
                    sidebar.click();
                    await delay(1000);
                  }
                  const newChatDiv = document.querySelector(
                    'div a[aria-label="New chat"]'
                  ) as HTMLElement;
                  console.log("newChatDiv", newChatDiv);
                  if (newChatDiv) {
                    newChatDiv.click();
                    await delay(1000);
                    console.log("clicked newchat");
                  }

                  const inputDiv = document.querySelector(
                    'div[aria-label="Write your prompt to Claude"] p[data-placeholder="How can I help you today?"]'
                  ) as HTMLElement | null;

                  console.log("inputDiv", inputDiv);

                  //   if (inputDiv) {
                  //     inputDiv.focus();
                  //     const event = new InputEvent("input", {
                  //       bubbles: true,
                  //       cancelable: true,
                  //       inputType: "insertText",
                  //       data: query,
                  //     });
                  //     inputDiv.dispatchEvent(event);
                  //     await delay(500);
                  //   }

                  if (inputDiv) {
                    inputDiv.focus();
                    inputDiv.textContent = query; // Set the value directly

                    const inputEvent = new Event("input", { bubbles: true });
                    inputDiv.dispatchEvent(inputEvent);

                    const changeEvent = new Event("change", { bubbles: true });
                    inputDiv.dispatchEvent(changeEvent);

                    const keyupEvent = new KeyboardEvent("keyup", {
                      bubbles: true,
                      cancelable: true,
                      key: "Enter",
                      code: "Enter",
                      keyCode: 13,
                    });
                    inputDiv.dispatchEvent(keyupEvent);

                    await delay(500);
                  }

                  const submitBtn = document.querySelector(
                    'button[aria-label="Send message"]'
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
          try {
            const parent = document.querySelector(
              'div[class^="font-claude-message"]'
            );
            if (!parent) return "No content found";

            const divs = Array.from(parent.children).filter(
              (child) =>
                child.tagName.toLowerCase() === "div" &&
                !child.classList.contains("transition-all")
            );

            const htmlList = divs.map((div) => div.outerHTML);

            console.log("Extracted divs:", htmlList);
            return htmlList;
          } catch (e: any) {
            return `Error: ${e.message}`;
          }
        },
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          console.error("Injection error:", chrome.runtime.lastError.message);
          return;
        }

        console.log("injectionResults", injectionResults);
        const result = injectionResults?.[0]?.result;

        // Convert to string safely
        let html: string;

        if (Array.isArray(result)) {
          html = result.join("\n"); // join array of strings
        } else if (typeof result === "string") {
          html = result;
        } else {
          html = ""; // fallback for undefined or unexpected
        }

        setData({ html, text: "" });
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
        // func: () => {
        //   const delay = (ms: number) =>
        //     new Promise((res) => setTimeout(res, ms));
        //   const parent = document.querySelector(
        //     'div[class^="font-claude-message"]'
        //   );
        //   if (!parent) return "";

        //   const transitionDivs = parent.querySelectorAll("div.transition-all");
        //   const links: string[] = [];
        //   console.log("before - links", links);

        //   transitionDivs.forEach(async (div) => {
        //     const button = div.querySelector("button");
        //     if (button) {
        //       button.click();
        //       await delay(500);
        //     }

        //     const anchorElements = div.querySelectorAll("a");

        //     anchorElements.forEach((element) => {
        //       const anchor = element as HTMLAnchorElement;
        //       const paragraphs = anchor.querySelectorAll("p");
        //       console.log("anchor", anchor);

        //       if (paragraphs.length >= 2) {
        //         const title = paragraphs[0]?.textContent?.trim() || "No Title";
        //         links.push(`[${title}](${anchor.href})`);
        //       }
        //     });
        //   });

        //   console.log("after - links", links);

        //   return links.join("##NEWLINE##");
        // },

        func: async () => {
          const delay = (ms: number) =>
            new Promise((res) => setTimeout(res, ms));

          const parent = document.querySelector(
            'div[class^="font-claude-message"]'
          );
          if (!parent) return "";

          const transitionDivs = parent.querySelectorAll("div.transition-all");
          const links: string[] = [];
          console.log("before - links", links);

          for (const div of transitionDivs) {
            const button = div.querySelector("button");
            if (button) {
              button.click();
              await delay(500); // wait for content to load after click
            }

            const anchorElements = div.querySelectorAll("a");

            anchorElements.forEach((element) => {
              const anchor = element as HTMLAnchorElement;
              const paragraphs = anchor.querySelectorAll("p");
              console.log("anchor", anchor);

              if (paragraphs.length >= 2) {
                const title = paragraphs[0]?.textContent?.trim() || "No Title";
                links.push(`[${title}](${anchor.href})`);
              }
            });
          }

          console.log("after - links", links);

          return links.join("##NEWLINE##");
        },
      },
      (injectionResults) => {
        const result = injectionResults?.[0]?.result;
        console.log("result", result);
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
        const chatId = extractIdFromPathForClaude(newUrl);
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
        // 1. Remove user account logo
        document
          .querySelectorAll(
            "div.flex.shrink-0.items-center.justify-center.rounded-full.font-bold.select-none.h-7.w-7.text-\\[12px\\].bg-text-200.text-bg-100"
          )
          .forEach((el) => el.remove());

        // 2. Remove Claude logo at the bottom of the response
        document
          .querySelectorAll(
            "div.ml-1.mt-0\\.5.flex.items-center.transition-transform.duration-300.ease-out"
          )
          .forEach((el) => el.remove());

        // 3. Remove share div at the top right
        const shareDiv = document.querySelector("div.right-3.flex.gap-2");
        if (shareDiv) shareDiv.remove();

        // 4. Change query box background color to grey
        const queryBox = document.querySelector(
          "div.group.relative.inline-flex.gap-2.bg-bg-300.rounded-xl"
        ) as HTMLElement;
        if (queryBox) queryBox.style.backgroundColor = "#e9e9e9";

        // 5. Remove header bar
        const headerBar = document.querySelector(
          "header.flex.w-full.bg-bg-100.sticky.top-0"
        );
        if (headerBar) headerBar.remove();

        // 6. Remove input field container
        const inputField = document.querySelector(
          "div.sticky.bottom-0.mx-auto.w-full.pt-6.z-\\[5\\]"
        );
        if (inputField) inputField.remove();

        // 7. Remove response option buttons (like 👍 👎, Regenerate)
        document
          .querySelectorAll(
            "div.text-text-300.flex.items-stretch.justify-between"
          )
          .forEach((el) => el.remove());

        // 8. Remove sidebar by aria-label
        const sidebarAria = document.querySelector('[aria-label="Sidebar"]');
        if (sidebarAria) sidebarAria.remove();

        // 9. Remove sidebar by class name
        const sidebarClass = document.querySelector(
          "div.h-screen.flex.flex-col.gap-3.pb-2.px-0.fixed.top-0.left-0"
        );
        if (sidebarClass) sidebarClass.remove();
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

export default Claude;
