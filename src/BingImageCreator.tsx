/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  AgentToAiType,
  AiAlias,
  type AiAliasType,
  type AiType,
  type QueryFormData,
} from "./types";
import Breadcrumbs from "./components/Breadcrumbs/Breadcrumbs";
import CopyButton from "./components/CopyButton/CopyButton";
import Button from "./components/Button/Button";
import { extractIdFromPathForBIC } from "./helpers/chatgpt/extractId";
import { saveOrUpdate } from "./utils";

interface BingImageCreatorProps {
  goBack?: () => void;
  goHome: () => void;
  goQueryList: () => void;
  queryData: QueryFormData | null;
  refreshQueryData: () => Promise<void>;
}
const BingImageCreator = ({
  goHome,
  goQueryList,
  queryData,
  refreshQueryData,
}: BingImageCreatorProps) => {
  const [id, setId] = useState<string>("");
  const [isAutomationRunning, setIsAutomationRunning] = useState(false);
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberValue, setNumberValue] = useState<number | undefined>();

  const { OID = "", Query = "", Engine = "" } = queryData || {};

  const aiType: AiType = AgentToAiType[Engine]; // "chatgpt"
  const alias: AiAliasType = AiAlias[aiType]; // "cgp"
  const ResponseImage = `${alias}${OID}.png`; // "cgp123.png"

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

  const handleSave = async () => {
    const responseHTML = "<div/>";
    const responseText = "{}";
    const timestamp = formattedDate;

    const isComplete =
      id && OID && Query && responseText && responseHTML && timestamp;
    const responseCode = isComplete ? "Success" : "";

    if (!numberValue || numberValue < 1) {
      alert("Please enter a valid image number.");
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      alert("No active tab found.");
      return;
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (index: number) => {
          const images = document.querySelectorAll<HTMLImageElement>(
            ".imgri-outer-container img"
          );
          const img = images[index];
          return img?.src || null;
        },
        args: [numberValue - 1],
      });

      const src = results?.[0]?.result;
      if (!src) {
        alert(`No image found at position ${numberValue}`);
        return;
      }

      const blob = await fetch(src).then((res) => res.blob());

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${ResponseImage}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      // alert("Image downloaded successfully.");
    } catch (err) {
      console.error("Failed to download image:", err);
      alert("Failed to download image.");
    }

    const payload = {
      ChatID: id,
      OID,
      Query,
      ResponseText: responseText,
      ResponseHTML: responseHTML,
      Sources: "",
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

  const extractIdFromUrl = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tab.url || "";
    const id = extractIdFromPathForBIC(url);
    if (id) {
      setId(id);
    }
  };

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
                const inputDiv = document.querySelector(
                  "textarea.b_searchbox.gi_sb"
                ) as HTMLTextAreaElement | null;

                if (inputDiv) {
                  inputDiv.focus();
                  inputDiv.value = query; // Set the value directly

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

                const createButton = document.querySelector(
                  "#create_btn_c"
                ) as HTMLButtonElement;

                if (createButton && !createButton.disabled) {
                  createButton.click();
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

  const startExtract = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          document
            .querySelectorAll(".imgri-inner-container img")
            .forEach((img, index) => {
              const label = document.createElement("div");
              label.textContent = `${index + 1}`;
              label.style.position = "absolute";
              label.style.top = "4px";
              label.style.left = "4px";
              label.style.background = "rgba(0, 0, 0, 0.6)";
              label.style.color = "#fff";
              label.style.padding = "2px 6px";
              label.style.borderRadius = "4px";
              label.style.fontSize = "12px";
              label.style.fontWeight = "bold";
              label.style.zIndex = "10";
              const wrapper = img.parentElement as HTMLElement | null;
              if (wrapper) {
                if (getComputedStyle(wrapper).position === "static") {
                  wrapper.style.position = "relative";
                }
                wrapper.prepend(label);
              }
            });
        },
      });
    }
    setShowNumberInput(true);
    await extractIdFromUrl();
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
          <p style={{fontWeight:"bold"}}>Query ID:</p>
          <div className="value-container">
            <span>{OID}</span>
            <CopyButton value={OID} />
          </div>
        </div>

        <div>
          <p style={{fontWeight:"bold"}}>Engine:</p>
          <div className="value-container">
            <span>{Engine}</span>
            <CopyButton value={Engine} />
          </div>
        </div>
        <search></search>

        <div>
          <p style={{fontWeight:"bold"}}>Query:</p>
          <div className="value-container">
            <span>{Query}</span>
            <CopyButton value={Query} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <p style={{fontWeight:"bold"}}>Chat ID:</p>
            <button
              style={{
                width: "15%",
                backgroundColor: " #28a745",
                color: "white",
                border:"0",
                padding:"5px"
              }}
            >
              Retry
            </button>
          </div>
          <div className="value-container">
            <span>{id}</span>
            <CopyButton value={id} />
          </div>
        </div>

        <div>
          <p style={{fontWeight:"bold"}}>Date:</p>
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

      <div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
        {showNumberInput && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                value={numberValue ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  const num = Number(value);
                  if (!isNaN(num)) setNumberValue(num);
                  else setNumberValue(0);
                }}
                placeholder="Enter a number"
                style={{ width: "84%", padding: "0.5rem", marginTop: "10px" }}
              />
            </div>
            <div style={{ width: "48%" }}>
              <Button
                onClick={handleSave}
                disabled={!numberValue}
                style={{ padding: "8px 26px" }}
              >
                Save & Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BingImageCreator;
