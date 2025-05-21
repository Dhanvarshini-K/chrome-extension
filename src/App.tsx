 /* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import "./App.css";
import Home from "./pages/Home/Home";
import QueryList from "./pages/QueryList/QueryList";
import Perplexity from "./Perplexity";
import { getCSVData } from "./utils";
import Chatgpt from "./ChatGpt";

const ai = import.meta.env.VITE_AI;

function App() {
  const [page, setPage] = useState<"home" | "queryList" | "chat">("home");
  const [selectedQuery, setSelectedQuery] = useState<{ OID: string; query: string } | null>(null);
  console.log("page",page)

  const goHome = () => setPage("home");
  const goQueryList = () => setPage("queryList");
  const goChat = (item: { OID: string; query: string }) => {
    setSelectedQuery(item);
    setPage("chat");
  };

  const data = getCSVData();

  const renderAppContent = () => {

    if (ai === "perplexity") return <Perplexity />;

    switch (page) {
      case "home":
        return <Home goQueryList={goQueryList} />;
      case "queryList":
        return <QueryList data={data} goHome={goHome} goChat={goChat} />;
      case "chat":
        return <Chatgpt queryData={selectedQuery}  goHome={goHome} goQueryList={goQueryList} />;
      default:
        return <Home goQueryList={goQueryList} />;
    }
  };

  return renderAppContent();
}

export default App;
