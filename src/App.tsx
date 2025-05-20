/* eslint-disable @typescript-eslint/no-explicit-any */
import "./App.css";
import Home from "./pages/Home/Home";
import Perplexity from "./Perplexity";

const ai = import.meta.env.VITE_AI;

function App() {
    const renderAi = () => {
    switch (ai) {
      case "chatgpt":
        return <Home />;
      case "perplexity":
        return <Perplexity />;
      default:
        return <Home />;
    }
  };

  return renderAi();
}

export default App;
