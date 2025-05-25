/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import "./App.css";
import Home from "./pages/Home/Home";
import QueryList from "./pages/QueryList/QueryList";
import Perplexity from "./Perplexity";
import { getAllFromIndexedDB } from "./utils";
import Chatgpt from "./ChatGpt";
import type { QueryFormData, QueryItem } from "./types";

const ai = import.meta.env.VITE_AI;

function App() {
  const [page, setPage] = useState<"home" | "queryList" | "chat">("home");
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
    setSelectedQuery(item);
    setPage("chat");
  };

  const renderAppContent = () => {

    if (ai === "perplexity") return <Perplexity />;

    switch (page) {
      case "home":
        return <Home goQueryList={goQueryList} refreshQueryData={refreshQueryData} />;
      case "queryList":
        return <QueryList goHome={goHome} goChat={goChat} data={queryData} setQueryData={setQueryData} refreshQueryData={refreshQueryData}/>;
      case "chat":
        return <Chatgpt queryData={selectedQuery} goHome={goHome} goQueryList={goQueryList} refreshQueryData={refreshQueryData} />;
      default:
        return <Home goQueryList={goQueryList} refreshQueryData={refreshQueryData} />;
    }
  };

  return renderAppContent();
}

export default App;
