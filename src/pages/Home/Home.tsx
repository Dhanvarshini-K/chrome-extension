import { useEffect, useState } from "react";
import Button from "../../components/Button/Button";
import "./Home.css";
import { setCSVData } from "../../utils";
import { createTableAndSaveData } from "../../utils/indexedDB";
import { AIEngine } from "../../types";
import { getStorage, setStorage } from "../../utils/localStorage";

interface HomeProps {
  goQueryList: () => void;
  refreshQueryData: () => Promise<void>;
}

const Home = ({ goQueryList, refreshQueryData }: HomeProps) => {
  const [agent, setAgent] = useState("");
  const [taskId, setTaskId] = useState("");
  const [engine, setEngine] = useState<AIEngine>(AIEngine.ChatGPT);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [extractDocument, setExtractDocument] = useState(false);

  const isSubmitDisabled = !agent || !engine || !file;

  useEffect(() => {
    (async () => {
      const { agent, taskId, engine, fileType, submitted, fileName } =
        await getStorage([
          "agent",
          "taskId",
          "engine",
          "fileType",
          "submitted",
          "fileName",
          "extractDocument",
        ]);

      if (fileName && fileType) {
        setFile(new File([], fileName, { type: fileType }));
      }
      if (agent) setAgent(agent);
      if (taskId) setTaskId(taskId);
      if (engine) setEngine(engine as AIEngine); // :white_check_mark: Cast if engine is typed enum or union
      if (submitted) setSubmitted(submitted); // Ensures boolean
      if (extractDocument !== undefined) {
        setExtractDocument(String(extractDocument) === "true");
      }
    })();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isTSV = selectedFile.name.toLowerCase().endsWith(".tsv");
      if (isTSV) {
        setFile(selectedFile);
        setError("");
      } else {
        setFile(null);
        setError("Only TSV files are allowed.");
      }
    }
  };

  const handleSubmit = () => {
    if (!file) {
      setError("Please select a TSV file before submitting.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const lines = text
        .trim()
        .split("\n")
        .filter((line) => line.trim() !== "");

      const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase());
      const oidIndex = headers.findIndex((h) => h === "oid");
      const queryIndex = headers.findIndex((h) => h === "query");

      if (oidIndex === -1 || queryIndex === -1) {
        setError("Required columns 'OID' and 'Query' not found in the file.");
        return;
      }

      const cleanQuery = (raw: string) => {
        if (raw && raw?.startsWith('"') && raw?.endsWith('"')) {
          raw = raw.slice(1, -1);
        }
        return raw?.replace(/""/g, '"');
      };

      const dataObjects = lines.slice(1).map((line) => {
        const columns = line.split("\t").map((col) => col.trim());

        return {
          TaskID: taskId,
          OID: columns[oidIndex],
          Query: cleanQuery(columns[queryIndex]),
          QueryID: columns[oidIndex],
          Agent: agent,
          Engine: engine,
          TurnID: "1",
          PerfData: "{}",
        };
      });

      const validData = dataObjects.filter((row) => row.OID);

      setCSVData(validData);
      await createTableAndSaveData(validData);

      await refreshQueryData();
      setStorage({
        agent,
        taskId,
        engine,
        fileType: file.type,
        submitted: "true",
        fileName: file.name,
        extractDocument: extractDocument.toString(), // or `"true"` / `"false"`
      });

      setSubmitted(true);
    };

    reader.readAsText(file);
  };

  return (
    <div className="home-container">
      <h2 className="header">Query Data Set</h2>

      <form className="form-container">
        {submitted ? (
          <div className="field-group">
            <div className="label-value-container">
              <p className="label">Agent:</p> {agent}
            </div>
            <div className="label-value-container">
              <p className="label">Task ID: </p>
              {taskId}
            </div>
            <div className="label-value-container">
              <p className="label">Engine: </p>
              {engine}
            </div>

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

              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as AIEngine)}
                className="input-field"
              >
                <option value={AIEngine.ChatGPT}>ChatGPT</option>
                <option value={AIEngine.Perplexity}>Perplexity</option>
                <option value={AIEngine.Copilot}>Copilot</option>
                <option value={AIEngine.BIC}>BIC</option>
                <option value={AIEngine.ClaudeS}>Claude Sonnet</option>
                <option value={AIEngine.ClaudeO}>Claude Opus</option>
              </select>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={extractDocument}
                onChange={(e) => setExtractDocument(e.target.checked)}
                className="checkbox-input"
              />
              Enable Extract Document
            </label>

            <input
              type="file"
              id="csvFileInput"
              accept=".tsv"
              onChange={handleFileChange}
              className="input-container"
            />

            <div className="data-container">
              <div className="upload-container">
                <label htmlFor="csvFileInput" className="upload-button">
                  Upload TSV
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
        {file && (
          <div className="file-name">
            <p className="label">Uploaded File: </p>
            {`${file.name}`}
          </div>
        )}
      </form>
    </div>
  );
};

export default Home;
