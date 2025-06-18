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


function App() {
  const [page, setPage] = useState<"home" | "queryList" | "chatgpt" | "perplexity" | "copilot">("home");
  const [selectedQuery, setSelectedQuery] = useState<QueryFormData | null>(null);
  const [queryData, setQueryData] = useState<QueryItem[]>([]);

  useEffect(() => {
    refreshQueryData();
  }, []);

  const refreshQueryData = async () => {
    const allData = await getAllFromIndexedDB();
    setQueryData(allData || []);
  };


  useEffect(() => {
    if (queryData?.length) {
      goQueryList();
    }
  }, [queryData])

  const goHome = () => setPage("home");
  const goQueryList = () => setPage("queryList");
  const goChat = (item: QueryFormData) => {
    console.log("item",item)
    setSelectedQuery(item);
    const storedEngine = localStorage.getItem("engine");

    if (storedEngine === "PplxPro") {
      setPage("perplexity");
    } else if (storedEngine === "ChatGptPro") {
      setPage("chatgpt");
    }
    else {
      setPage("copilot")
    }
  };

  const renderAppContent = () => {


    switch (page) {
      case "home":
        return <Home goQueryList={goQueryList} refreshQueryData={refreshQueryData} />;
      case "queryList":
        return <QueryList goHome={goHome} goChat={goChat} data={queryData} setQueryData={setQueryData} refreshQueryData={refreshQueryData} />;
      case "chatgpt":
        return <Chatgpt queryData={selectedQuery} goHome={goHome} goQueryList={goQueryList} refreshQueryData={refreshQueryData} />;
      case "perplexity":
        return <Perplexity goHome={goHome} goQueryList={goQueryList} refreshQueryData={refreshQueryData} queryData={selectedQuery} />
      case "copilot":
        return <Copilot goHome={goHome} goQueryList ={goQueryList} refreshQueryData={refreshQueryData} queryData={selectedQuery}/>
      default:
        return <Home goQueryList={goQueryList} refreshQueryData={refreshQueryData} />;
    }
  };

  return renderAppContent();
}

export default App;
