import { useState } from "react";
import Button from "../../components/Button/Button";
import "./Home.css";
import { setCSVData } from "../../utils";
import { AIEngine } from "../../types/ai.type";
import { createTableAndSaveData } from "../../utils/indexedDB";

interface HomeProps {
  goQueryList: () => void;
}

const Home = ({ goQueryList }: HomeProps) => {
  const [agent, setAgent] = useState("");
  const [turnId, setTurnId] = useState("");
  const [engine, setEngine] = useState<AIEngine>(AIEngine.ChatGPT);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const isSubmitDisabled = !agent || !turnId || !engine || !file;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      const isCSV = selectedFile.name.toLowerCase().endsWith(".csv");

      if (isCSV) {
        setFile(selectedFile);
        setError("");
      } else {
        setFile(null);
        setError("Only CSV files are allowed.");
      }
    }
  };

  const handleSubmit = () => {

    if (!file) {
      setError("Please select a CSV file before submitting.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;

      const lines = text
        .trim()
        .split("\n")
        .map((line) => line.replace(/^"|"$/g, ""));

      const dataObjects = lines
        .slice(1)
        .filter((line) => line.trim() !== "")
        .map((line) => {
          const [OID, ...queryParts] = line.split(",");
          const query = queryParts.join(",").trim();
          return {
            OID: OID.trim(),
            Query: query,
            Agent: agent,
            Engine: engine,
            TurnID: turnId,
            perfData: "{}",
          };
        });

      console.log("data ", dataObjects);
      setCSVData(dataObjects);
      createTableAndSaveData(dataObjects);
      goQueryList();
    };

    reader.readAsText(file);
  };

  return (
    <div className="home-container">
      <h2 className="header">Upload Query Data Set</h2>

      <form className="form-container">
        <div className="field-group">
          <input
            type="text"
            placeholder="Agent"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="input-field"
          />

          <input
            type="text"
            placeholder="Turn ID"
            value={turnId}
            onChange={(e) => setTurnId(e.target.value)}
            className="input-field"
          />

          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as AIEngine)}
            className="input-field"
          >
            <option value={AIEngine.ChatGPT}>ChatGPT</option>
            <option value={AIEngine.Perplexity}>Perplexity</option>
          </select>
        </div>

        <input
          type="file"
          id="csvFileInput"
          accept=".csv"
          onChange={handleFileChange}
          className="input-container"
        />

        <div className="data-container">
          <div className="upload-container">
            <label htmlFor="csvFileInput" className="upload-button">
              Upload CSV
            </label>
          </div>

          <Button
            buttonText="Submit"
            type="submit"
            disabled={isSubmitDisabled}
            className="button-field"
            onClick={handleSubmit}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {file && <span className="file-name">{file.name}</span>}
      </form>
    </div>
  );
};

export default Home;
