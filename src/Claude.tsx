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
// import { getStorage } from "./utils/localStorage";

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
  const [selectedOption, setSelectedOption] = useState<string>("");

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
    if (!mode) return;
    if (!queryData?.Query) return;

    try {
      setIsAutomationRunning(true);

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        console.error("[Automation] No active tab found");
        setIsAutomationRunning(false);
        return;
      }

      const query = queryData.Query;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (query: string, engine: string) => {
          const delay = (ms: number) =>
            new Promise((res) => setTimeout(res, ms));

          console.log("[Automation] Starting simulateUserFlow...");

          async function clickModelSelectorAndWaitForDropdown() {
            const containerDiv = document.querySelector(
              "div#radix-«r16v»"
            ) as HTMLElement | null;
            const modelSelectorBtn = document.querySelector(
              'button[data-testid="model-selector-dropdown"]'
            ) as HTMLElement | null;

            if (!containerDiv && !modelSelectorBtn) {
              console.log(
                "[Automation] Neither container div nor button found"
              );
              return false;
            }

            if (containerDiv) {
              containerDiv.click();
              console.log("[Automation] Clicked container div");
              await delay(300);
            }

            if (modelSelectorBtn) {
              modelSelectorBtn.dispatchEvent(
                new PointerEvent("pointerdown", { bubbles: true })
              );
              modelSelectorBtn.dispatchEvent(
                new PointerEvent("pointerup", { bubbles: true })
              );
              modelSelectorBtn.click();
              console.log(
                "[Automation] Fired pointerdown, pointerup, and click on button"
              );
            }

            const dropdownSelector = 'div[role="menu"]';
            let tries = 0;
            while (tries < 20) {
              const dropdown = document.querySelector(dropdownSelector);
              if (dropdown && dropdown.getAttribute("data-state") === "open") {
                console.log("[Automation] Dropdown is open");
                return true;
              }
              await delay(200);
              tries++;
            }

            const dropdown = document.querySelector(dropdownSelector);
            if (dropdown) {
              console.log(
                "[Automation] Dropdown exists but data-state:",
                dropdown.getAttribute("data-state")
              );
              console.log(
                "[Automation] Dropdown CSS display:",
                getComputedStyle(dropdown).display
              );
            } else {
              console.log("[Automation] Dropdown does not exist in DOM");
            }

            return false;
          }

          // Step 1: Click sidebar
          const sidebar = document.querySelector(
            'button[aria-label="Sidebar"]'
          ) as HTMLButtonElement;
          if (sidebar) {
            sidebar.click();
            console.log("[Automation] Sidebar clicked");
            await delay(1000);
          } else {
            console.log("[Automation] Sidebar not found");
          }

          // Step 2: Click "New chat"
          const newChatDiv = document.querySelector(
            'div a[aria-label="New chat"]'
          ) as HTMLElement;
          if (newChatDiv) {
            newChatDiv.click();
            console.log("[Automation] New Chat clicked");
            await delay(1500);
          } else {
            console.log("[Automation] New Chat not found");
          }

          // Step 3: Open model selector dropdown robustly
          const dropdownOpened = await clickModelSelectorAndWaitForDropdown();
          if (!dropdownOpened) {
            console.log(
              "[Automation] Failed to open model selector dropdown, aborting"
            );
            return;
          }

          // Step 4: Select model based on engine value
          const engineMap: Record<string, string> = {
            ClaudeS: "Claude Sonnet 4",
            ClaudeO: "Claude Opus 4",
          };
          const selectedModelName = engineMap[engine] || engine;
          console.log(
            `[Automation] Resolved engine "${engine}" to model "${selectedModelName}"`
          );

          const dropdownMenu = document.querySelector(
            'div[role="menu"][data-state="open"]'
          );
          if (!dropdownMenu) {
            console.log(
              "[Automation] Dropdown menu disappeared before selection"
            );
            return;
          }

          const menuItems = Array.from(
            dropdownMenu.querySelectorAll('[role="menuitem"]') || []
          );
          console.log(`[Automation] Found ${menuItems.length} model items`);

          const modelItem = menuItems.find((item) =>
            item.textContent?.includes(selectedModelName)
          ) as HTMLElement | undefined;

          if (modelItem) {
            modelItem.click();
            console.log(`[Automation] Clicked on model: ${selectedModelName}`);
            await delay(1500);
          } else {
            console.log(
              `[Automation] Model "${selectedModelName}" not found in dropdown`
            );
          }

          // Step 5: Type query
          const inputDiv = document.querySelector(
            'div[aria-label="Write your prompt to Claude"] p[data-placeholder="How can I help you today?"]'
          ) as HTMLElement | null;

          if (inputDiv) {
            inputDiv.focus();
            inputDiv.textContent = query;
            console.log("[Automation] Query inserted into input box");

            inputDiv.dispatchEvent(new Event("input", { bubbles: true }));
            inputDiv.dispatchEvent(new Event("change", { bubbles: true }));

            inputDiv.dispatchEvent(
              new KeyboardEvent("keyup", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
                code: "Enter",
                keyCode: 13,
              })
            );

            await delay(500);
          } else {
            console.log("[Automation] Input box not found");
          }

          // Step 6: Click send
          const submitBtn = document.querySelector(
            'button[aria-label="Send message"]'
          ) as HTMLButtonElement;

          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
            console.log("[Automation] Send message button clicked");
          } else {
            console.log(
              "[Automation] Send message button not found or disabled"
            );
          }

          console.log("[Automation] simulateUserFlow completed");
        },
        args: [query, Engine],
      });

      setIsAutomationRunning(false);
    } catch (error: any) {
      console.error("Automation error:", error);
      setIsAutomationRunning(false);
    }
  };
  const triggerExtractResponse = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      console.error("No active tab found");
      return;
    }

    //============== iframe =============

    // const { extractCodeBlock } = await getStorage(["extractCodeBlock"]);
    // const isExtractCodeBlock = extractCodeBlock === true || extractCodeBlock === "true";

    // if (!isExtractCodeBlock) {
    //   // 👇 Normal Claude response extraction from main frame
    //   chrome.scripting.executeScript(
    //     {
    //       target: { tabId: tab.id },
    //       func: () => {
    //         try {
    //           const parent = document.querySelector(
    //             'div[class^="font-claude-message"]'
    //           ) as HTMLElement;
    //           if (!parent) return "No content found";

    //           const divs = Array.from(parent.children).filter(
    //             (child) =>
    //               child.tagName.toLowerCase() === "div" &&
    //               !child.classList.contains("transition-all")
    //           );

    //           const htmlList = divs.map((div) => div.outerHTML);
    //           console.log("Extracted Claude divs:", htmlList);
    //           return htmlList;
    //         } catch (e: any) {
    //           return `Error: ${e.message}`;
    //         }
    //       },
    //     },
    //     (injectionResults) => {
    //       if (chrome.runtime.lastError) {
    //         console.error("Injection error:", chrome.runtime.lastError.message);
    //         return;
    //       }

    //       const result = injectionResults?.[0]?.result;
    //       const html = Array.isArray(result)
    //         ? result.join("\n")
    //         : typeof result === "string"
    //         ? result
    //         : "";

    //       setData({ html, text: "" });
    //     }
    //   );
    //   return;
    // }

    // 👇 Document extract mode (from iframe) ==> for UI
    // chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
    //   if (!frames || !Array.isArray(frames)) {
    //     console.error("No frames found or frames is not an array");
    //     return;
    //   }

    //   const targetFrame = frames.find((f) =>
    //     f.url.includes("claudeusercontent.com")
    //   );

    //   if (!targetFrame) {
    //     console.error("Claude iframe not found");
    //     return;
    //   }

    //   chrome.scripting.executeScript(
    //     {
    //       target: { tabId: tab.id!, frameIds: [targetFrame.frameId] },
    //       func: () => {
    //         try {
    //           const parent = document.querySelector(
    //             "#artifacts-component-root-react"
    //           ) as HTMLElement;
    //           if (!parent) return "No content found";

    //           const innerDiv = parent.querySelector("div");
    //           if (!innerDiv) return "No inner div found";

    //           console.log("Extracted document div:", innerDiv.outerHTML);
    //           return [innerDiv.outerHTML];
    //         } catch (e: any) {
    //           return `Error: ${e.message}`;
    //         }
    //       },
    //     },
    //     (injectionResults) => {
    //       if (chrome.runtime.lastError) {
    //         console.error(
    //           "Injection error (iframe):",
    //           chrome.runtime.lastError.message
    //         );
    //         return;
    //       }

    //       const result = injectionResults?.[0]?.result;
    //       const html = Array.isArray(result)
    //         ? result.join("\n")
    //         : typeof result === "string"
    //         ? result
    //         : "";

    //       setData({ html, text: "" });
    //     }
    //   );
    // });
    //============== iframe =============

    //===================== code block with response ================
    // chrome.scripting.executeScript(
    //   {
    //     target: { tabId: tab.id },
    //     func: () => {
    //       try {
    //         // 1. Extract first div from .font-claude-message (excluding transition-all)
    //         const claudeContainer = document.querySelector(
    //           "div.font-claude-message"
    //         ) as HTMLElement | null;
    //         let messageHTML = "";

    //         if (claudeContainer) {
    //           const filteredChildren = Array.from(
    //             claudeContainer.children
    //           ).filter(
    //             (child): child is HTMLElement =>
    //               child.tagName.toLowerCase() === "div" &&
    //               !child.classList.contains("transition-all")
    //           );

    //           const htmlList = filteredChildren.map((div) => div.outerHTML);
    //           messageHTML = htmlList.join("\n");
    //         }

    //         // 2. Extract first code block
    //         const codeDiv = document.querySelector("div.code-block__code");
    //         const codeHTML = codeDiv?.outerHTML || "";

    //         return { messageHTML, codeHTML };
    //       } catch (e: any) {
    //         return { error: e.message };
    //       }
    //     },
    //   },
    //   (injectionResults) => {
    //     if (chrome.runtime.lastError) {
    //       console.error("Injection error:", chrome.runtime.lastError.message);
    //       return;
    //     }

    //     const result = injectionResults?.[0]?.result;
    //     console.log("response result", result);

    //     if (result?.error) {
    //       console.error("Extraction error:", result.error);
    //       return;
    //     }

    //     const html = [result?.messageHTML, result?.codeHTML].join("\n");

    //     const expectedHtml = [result?.messageHTML, result?.codeHTML].join("\n");
    //     const isExactMatch = html === expectedHtml;

    //     if (!isExactMatch) {
    //       console.warn(
    //         "Combined HTML does NOT exactly match expected concatenation."
    //       );
    //     } else {
    //       console.log("Exact match confirmed.");
    //     }

    //     setData({ html, text: "" });
    //   }
    // );
    //===================== code block with response ================

    //===================== code block or response ================
    // chrome.scripting.executeScript(
    //   {
    //     target: { tabId: tab.id },
    //     args: [selectedOption],
    //     func: (selected) => {
    //       try {
    //         let html = "";

    //         if (selected === "message") {
    //           const claudeContainer = document.querySelector(
    //             "div.font-claude-message"
    //           ) as HTMLElement | null;

    //           if (claudeContainer) {
    //             const filteredChildren = Array.from(
    //               claudeContainer.children
    //             ).filter(
    //               (child): child is HTMLElement =>
    //                 child.tagName.toLowerCase() === "div" &&
    //                 !child.classList.contains("transition-all")
    //             );

    //             const htmlList = filteredChildren.map((div) => div.outerHTML);
    //             html = htmlList.join("\n");
    //           }
    //         } else if (selected === "code") {
    //           const codeDiv = document.querySelector("div.code-block__code");
    //           html = codeDiv?.outerHTML || "";
    //         } else if (selected === "both") {
    //           // 1. Extract first div from .font-claude-message (excluding transition-all)
    //           const claudeContainer = document.querySelector(
    //             "div.font-claude-message"
    //           ) as HTMLElement | null;
    //           let messageHTML = "";

    //           if (claudeContainer) {
    //             const filteredChildren = Array.from(
    //               claudeContainer.children
    //             ).filter(
    //               (child): child is HTMLElement =>
    //                 child.tagName.toLowerCase() === "div" &&
    //                 !child.classList.contains("transition-all")
    //             );

    //             const htmlList = filteredChildren.map((div) => div.outerHTML);
    //             messageHTML = htmlList.join("\n");
    //           }

    //           // 2. Extract first code block
    //           const codeDiv = document.querySelector("div.code-block__code");
    //           const codeHTML = codeDiv?.outerHTML || "";

    //           return { messageHTML, codeHTML };
    //         }

    //         return { html };
    //       } catch (e: any) {
    //         return { error: e.message };
    //       }
    //     },
    //   },
    //   (injectionResults) => {
    //     if (chrome.runtime.lastError) {
    //       console.error("Injection error:", chrome.runtime.lastError.message);
    //       return;
    //     }

    //     const result = injectionResults?.[0]?.result;
    //     console.log("response result", result);

    //     if (result?.error) {
    //       console.error("Extraction error:", result.error);
    //       return;
    //     }

    //     setData({ html: result?.html || "", text: "" });
    //   }
    // );

    //both/code/message

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          try {
            // 1. Extract first div from .font-claude-message (excluding transition-all)
            const claudeContainer = document.querySelector(
              "div.font-claude-message"
            ) as HTMLElement | null;
            let messageHTML = "";

            if (claudeContainer) {
              const filteredChildren = Array.from(
                claudeContainer.children
              ).filter(
                (child): child is HTMLElement =>
                  child.tagName.toLowerCase() === "div" &&
                  !child.classList.contains("transition-all")
              );

              const htmlList = filteredChildren.map((div) => div.outerHTML);
              messageHTML = htmlList.join("\n");
            }

            // 2. Extract first code block
            const codeDiv = document.querySelector("div.code-block__code");
            const codeHTML = codeDiv?.outerHTML || "";

            return { messageHTML, codeHTML };
          } catch (e: any) {
            return { error: e.message };
          }
        },
      },
      // (injectionResults) => {
      //   if (chrome.runtime.lastError) {
      //     console.error("Injection error:", chrome.runtime.lastError.message);
      //     return;
      //   }

      //   const result = injectionResults?.[0]?.result;
      //   console.log("response result", result);

      //   if (result?.error) {
      //     console.error("Extraction error:", result.error);
      //     return;
      //   }

      //   if(selectedOption === "both"){

      //   }
      //   else if(selectedOption === "message"){

      //   }
      //   else if(selectedOption === "code"){

      //   }

      //   const html = [result?.messageHTML, result?.codeHTML].join("\n");

      //   const expectedHtml = [result?.messageHTML, result?.codeHTML].join("\n");
      //   const isExactMatch = html === expectedHtml;

      //   if (!isExactMatch) {
      //     console.warn(
      //       "Combined HTML does NOT exactly match expected concatenation."
      //     );
      //   } else {
      //     console.log("Exact match confirmed.");
      //   }

      //   setData({ html, text: "" });
      // }

      (injectionResults) => {
        if (chrome.runtime.lastError) {
          console.error("Injection error:", chrome.runtime.lastError.message);
          return;
        }

        const result = injectionResults?.[0]?.result;
        console.log("response result", result);

        if (result?.error) {
          console.error("Extraction error:", result.error);
          return;
        }

        let html = "";

        if (selectedOption === "both") {
          html = [result?.messageHTML, result?.codeHTML]
            .filter(Boolean)
            .join("\n");
        } else if (selectedOption === "message") {
          html = result?.messageHTML || "";
        } else if (selectedOption === "code") {
          html = result?.codeHTML || "";
        }

        const expectedHtml = [result?.messageHTML, result?.codeHTML]
          // .filter(Boolean)
          .join("\n");

        const isExactMatch = html === expectedHtml;

        if (!isExactMatch && selectedOption === "both") {
          console.warn(
            "Combined HTML does NOT exactly match expected concatenation."
          );
        } else if (selectedOption === "both") {
          console.log("Exact match confirmed.");
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

        func: async () => {
          const parent = document.querySelector(
            'div[class^="font-claude-message"]'
          );

          if (!parent) return "";

          const transitionDivs = parent.querySelectorAll("div.transition-all");
          const links: string[] = [];
          console.log("before - links", links);

          for (const div of transitionDivs) {
            // const button = div.querySelector("button");
            // if (button) {
            //   button.click();
            //   await delay(500); // wait for content to load after click
            // }

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

        //header of codeblock
        document
          .querySelector(
            ".pr-2.pl-3.flex.items-center.justify-between.gap-2.select-none.py-2"
          )
          ?.remove();

        document.body.style.backgroundColor = "#fff";
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
   <div className="value-container" style={{ flexDirection: "column", gap: "1rem" }}>
  {/* Run Automation Button */}
  <div style={{ width: "100%" }}>
    <Button
      onClick={runAutomation}
      buttonText="Run Automation"
      className="btn-run-automation"
      style={{ width: "100%" }}
      disabled={isAutomationRunning}
    />
  </div>

  {/* Extract Option and Start Extract - Horizontal layout */}
  <div
    style={{
      display: "flex",
      gap: "1rem",
      width: "100%",
      alignItems: "flex-end",
    }}
  >
    {/* Dropdown */}
    <div style={{ flex: 1 }}>
      <label
        htmlFor="extractType"
        style={{
          display: "block",
          fontWeight: "bold",
          marginBottom: "0.5rem",
        }}
      >
        Select Extract Type:
      </label>
      <select
        id="extractType"
        value={selectedOption}
        onChange={(e) => setSelectedOption(e.target.value)}
        className="select-extract-option"
        style={{
          padding: "0.5rem",
          fontSize: "1rem",
          width: "100%",
        }}
      >
        <option value="">-- Choose --</option>
        <option value="message">Message</option>
        <option value="code">Code</option>
        <option value="both">Both</option>
      </select>
    </div>

    {/* Start Extract Button */}
    {selectedOption && (
      <div style={{ width: "150px" }}>
        <Button
          buttonText="Start Extract"
          onClick={startExtract}
          className="btn-start-extract"
          style={{ width: "100%" }}
        />
      </div>
    )}
  </div>
</div>
  )
}
</div>);
}
export default Claude;
