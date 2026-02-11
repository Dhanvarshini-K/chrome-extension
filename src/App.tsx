 import { useEffect, useState } from "react";
import "./App.css";
import QueryList from "./pages/QueryList/QueryList";
import Perplexity from "./Perplexity";
import { getAllFromIndexedDB } from "./utils";
import Chatgpt from "./ChatGpt";
import type { QueryFormData, QueryItem } from "./types";
import Copilot from "./Copilot";
import { getStorage } from "./utils/localStorage";
import BingImageCreator from "./BingImageCreator";
import Claude from "./Claude";
import Validation from "./Validation";
import Home from "./pages/Home/Home";
import Gemini from "./Gemini";
import M365Copilot from "./M365Copilot";

function App() {
  const [page, setPage] = useState<
    | "home"
    | "queryList"
    | "chatgpt"
    | "perplexity"
    | "copilot"
    | "BIC"
    | "claude"
    | "validation"
    | "geminiPro"
    | "m365Copilot"
  >("home");
  const [selectedQuery, setSelectedQuery] = useState<QueryFormData | null>(
    null
  );
  const [queryData, setQueryData] = useState<QueryItem[]>([]);
  const [engine, setEngine] = useState<string | undefined>(undefined);

  useEffect(() => {
    refreshQueryData();
    (async () => {
      const { engine } = await getStorage(["engine"]);
      if (engine) {
        console.log("Loaded engine:", engine);
        setEngine(engine);
      }
    })();
  }, []);

  const refreshQueryData = async () => {
    const allData = await getAllFromIndexedDB();
    setQueryData(allData || []);
  };

  useEffect(() => {
    if (queryData?.length) {
      goQueryList();
    }
  }, [queryData]);

  const goHome = () => setPage("home");
  const goQueryList = () => setPage("queryList");
  const goToValidation = () => setPage("validation");

  const goChat = (item: QueryFormData) => {
    console.log("item", item);
    setSelectedQuery(item);
    if (item.Engine === "PplxPro") {
      setPage("perplexity");
    } else if (item.Engine === "ChatGpt") {
      setPage("chatgpt");
    } else if (item.Engine === "Copilot") {
      setPage("copilot");
    } else if (item.Engine === "ClaudePro" || engine === "ClaudeO") {
      setPage("claude");
    } else if (item.Engine === "Gemini") {
      setPage("geminiPro");
    } else {
      setPage("BIC");
    }
  };

  const renderAppContent = () => {
    switch (page) {
      case "home":
        return (
          <Home goQueryList={goQueryList} refreshQueryData={refreshQueryData} />
        );
      case "queryList":
        return (
          <QueryList
            goHome={goHome}
            goChat={goChat}
            data={queryData}
            setQueryData={setQueryData}
            refreshQueryData={refreshQueryData}
            goToValidation={goToValidation}
          />
        );
      case "validation":
        return <Validation data={queryData} goQueryList={goQueryList} />;
      case "chatgpt":
        return (
          <Chatgpt
            queryData={selectedQuery}
            goHome={goHome}
            goQueryList={goQueryList}
            refreshQueryData={refreshQueryData}
          />
        );
      case "perplexity":
        return (
          <Perplexity
            goHome={goHome}
            goQueryList={goQueryList}
            refreshQueryData={refreshQueryData}
            queryData={selectedQuery}
          />
        );
      case "copilot":
        return (
          <Copilot
            goHome={goHome}
            goQueryList={goQueryList}
            refreshQueryData={refreshQueryData}
            queryData={selectedQuery}
          />
        );
      case "claude":
        return (
          <Claude
            goHome={goHome}
            goQueryList={goQueryList}
            refreshQueryData={refreshQueryData}
            queryData={selectedQuery}
          />
        );
      case "geminiPro":
        return (
          <Gemini
            goHome={goHome}
            goQueryList={goQueryList}
            refreshQueryData={refreshQueryData}
            queryData={selectedQuery}
          />
        );
      case "BIC":
        return (
          <BingImageCreator
            goHome={goHome}
            goQueryList={goQueryList}
            queryData={selectedQuery}
            refreshQueryData={refreshQueryData}
          />
        );

      case "m365Copilot":
        return (
          <M365Copilot
            goHome={goHome}
            goQueryList={goQueryList}
            queryData={selectedQuery}
            refreshQueryData={refreshQueryData}
          />
        );

      default:
        return (
          <Home goQueryList={goQueryList} refreshQueryData={refreshQueryData} />
        );
    }
  };

  return renderAppContent();
}

export default App;
