/* eslint-disable @typescript-eslint/no-explicit-any */
import "./App.css";
import Chatgpt from "./ChatGpt";
import Perplexity from "./Perplexity";

const ai = import.meta.env.VITE_AI;

function App() {
  const renderAi = () => {
    switch (ai) {
      case "chatgpt":
        return <Chatgpt />;
      case "perplexity":
        return <Perplexity />;
      default:
        return <Chatgpt />;
    }
  };

  return renderAi();
}

export default App;
