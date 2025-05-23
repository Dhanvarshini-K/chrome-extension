import { useEffect, useState } from "react";
import Button from "../../components/Button/Button";
import "./Home.css";
import { setCSVData } from "../../utils";
import { createTableAndSaveData } from "../../utils/indexedDB";
import { AIEngine } from "../../types";

interface HomeProps {
  goQueryList: () => void;
  refreshQueryData: () => Promise<void>;
}

const Home = ({ goQueryList, refreshQueryData }: HomeProps) => {
  const [agent, setAgent] = useState("");
  const [turnId, setTurnId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [engine, setEngine] = useState<AIEngine>(AIEngine.ChatGPT);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isSubmitDisabled = !agent || !turnId || !engine || !file;

  useEffect(() => {
    const savedAgent = localStorage.getItem("agent");
    const savedTaskId = localStorage.getItem("taskId");
    const savedTurnId = localStorage.getItem("turnId");
    const savedEngine = localStorage.getItem("engine") as AIEngine;
    const wasSubmitted = localStorage.getItem("submitted") === "true";

    if (savedAgent) setAgent(savedAgent);
    if (savedTaskId) setTaskId(savedTaskId);
    if (savedTurnId) setTurnId(savedTurnId);
    if (savedEngine) setEngine(savedEngine);
    if (wasSubmitted) setSubmitted(true);
  }, []);

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
    reader.onload = async () => {
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
            TaskID: taskId,
            OID: OID.trim(),
            Query: query,
            Agent: agent,
            Engine: engine,
            TurnID: turnId,
            perfData: "{}",
          };
        });


      setCSVData(dataObjects);
      await createTableAndSaveData(dataObjects);

      await refreshQueryData();
      localStorage.setItem("agent", agent);
      localStorage.setItem("taskId", taskId);
      localStorage.setItem("turnId", turnId);
      localStorage.setItem("engine", engine);
      localStorage.setItem("submitted", "true");


      setSubmitted(true);
    };

    reader.readAsText(file);
  };

  return (
    <div className="home-container">
      <h2 className="header">Upload Query Data Set</h2>

      <form className="form-container">
        {submitted ? (
          <div className="field-group">
            <div className="label-value-container"><p className="label-value">Agent:</p> {agent}</div>
            <div className="label-value-container"><p className="label-value">Task ID: </p>{taskId}</div>
            <div className="label-value-container"><p className="label-value">Turn ID:</p> {turnId}</div>
            <div className="label-value-container"><p className="label-value">Engine: </p>{engine}</div>

            <Button
              buttonText="View Query List"
              className="view-query-list-button"
              onClick={goQueryList}
            />
          </div>
        ) : (
          <>
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
                placeholder="Task ID"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
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
          </>
        )}

        {error && <div className="error-message">{error}</div>}
        {file && <div className="label-value"><p>Uploaded File: </p>{file.name}</div>}
      </form>
    </div>
  );
};

export default Home;
