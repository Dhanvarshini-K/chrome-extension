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

      return /^[a-zA-Z0-9_-]{8,}$/.test(possibleId) ? possibleId : null;
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
        [
          ...document.querySelectorAll("div.-mx-sm.gap-xs.relative.flex"),
          ...document.querySelectorAll("div.gap-sm.grid.grid-cols-4.md\\:px-0"),
        ].forEach((el) => el.remove());
      },
    });
  };



  const handleTabClick = async (tabName: ResponseTabsType) => {
    if (tabName === ResponseTabs.CITATIONS) {
      await injectScript();

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            window.addEventListener("message", (event) => {
              console.log("event", event);
              if (event.source !== window) return;

              if (event.data?.type === "CITATIONS_FOUND") {
                const markdown = event.data.citations
                  .map((page: any) => `[${page.title}](${page.url})`)
                  .join("##NEWLINE##");

                console.log('markdown', markdown);
                chrome.runtime.sendMessage({
                  type: "SAVE_CITATIONS",
                  citations: event.data.citations,
                  OID: event.data.OID
                });
              }
            });
          },
        });

        setTimeout(() => {
          const storageKey = `citations_${OID}`;

          chrome.storage.local.get([storageKey], (result) => {
            const citations = result[storageKey];
            const markdown = citations
              ?.map((page: any) => `[${page.title}](${page.url})`)
              .join("##NEWLINE##");

            setCitationsData(markdown || "");
          });

        }, 1000);
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
            <span>{Query}</span>
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
          <Button onClick={removeDiv}>Remove Related Divs</Button>
        </div>

        <div style={{ marginBottom: "1rem" , width: "45%"}}>
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
            {activeTab === ResponseTabs.CITATIONS && citationsData && (
              <div>
                <CopyButton value={citationsData} />
                <pre className="pre-block">{citationsData}</pre>
              </div>
            )}
          </div>

          <div className="save-extract-buttons-container">
            <Button
              onClick={handleSave}
              disabled={
                !extractedTabs.html ||
                !extractedTabs.markdown
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
}

export default Perplexity;
