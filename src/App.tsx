/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import "./App.css";
import Home from "./pages/Home/Home";
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

function App() {
  const [page, setPage] = useState<
    | "home"
    | "queryList"
    | "chatgpt"
    | "perplexity"
    | "copilot"
    | "BIC"
    | "claude"
    |"validation"
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

    if (engine === "PplxPro") {
      setPage("perplexity");
    } else if (engine === "ChatGptPro") {
      setPage("chatgpt");

    } else if (engine === "Cplt") {
      setPage("copilot");
    } else if (engine === "ClaudeS" || engine === "ClaudeO") {
      setPage("claude");

    }
    else {
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
          return(
            <Validation data={queryData}
            goQueryList={goQueryList}
            
            />
          );
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
      case "BIC":
        return (
          <BingImageCreator
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
