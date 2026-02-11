/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import Button from "../../components/Button/Button";
import "./Home.css";
import {  createTableAndSaveData } from "../../utils/indexedDB";
import { AIEngine } from "../../types";
import { getStorage } from "../../utils/localStorage";
import { setCSVData } from "../../utils";

interface HomeProps {
  goQueryList: () => void;
  refreshQueryData: () => Promise<void>;
}

const Home = ({ goQueryList, refreshQueryData }: HomeProps) => {
  const [agent, setAgent] = useState("");
  const [taskId, setTaskId] = useState("");
  const [engine, setEngine] = useState<AIEngine>(AIEngine.Perplexity);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [extractCodeBlock, setExtractCodeBlock] = useState(false);

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
          "extractCodeBlock",
        ]);

      if (fileName && fileType) {
        setFile(new File([], fileName, { type: fileType }));
      }
      if (agent) setAgent(agent);
      if (taskId) setTaskId(taskId);
      if (engine) setEngine(engine as AIEngine); // :white_check_mark: Cast if engine is typed enum or union
      if (submitted) setSubmitted(submitted); // Ensures boolean
      if (extractCodeBlock !== undefined) {
        setExtractCodeBlock(String(extractCodeBlock) === "true");
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

  // const getQueryHeaderByEngine = (engine: string) => {
  //   console.log('engine',engine)
  //   switch (engine.toLowerCase()) {
  //     case "copilot":
  //       return "share_link_copilot";
  //     case "chatgpt":
  //       return "share_link_chatgpt";
  //     case "gemini":
  //       return "share_link_gemini";
  //     default:
  //       return "";
  //   }
  // };
  const handleSubmit = () => {
    console.log('file',file)
    if (!file) {
      setError("Please select a TSV file before submitting.");
      return;
    }


    const reader = new FileReader();
    reader.onload = async () => {
      console.log('reader',reader)
      const text = reader.result as string;
      console.log('text',text)
      const lines = text
        .trim()
        .split("\n")
        .filter((line) => line.trim() !== "");

        console.log('lines',lines)

      const headers = lines[0].split("\t").map((h) => h.trim());
      console.log("📋 Headers in TSV file:", headers);

      const cleanValue = (raw: string) => {
        if (raw?.startsWith('"') && raw?.endsWith('"')) {
          raw = raw.slice(1, -1);
        }
        return raw?.replace(/""/g, '"');
      };

      const dataObjects = lines.slice(1).map((line) => {
        const columns = line.split("\t").map((col) => col.trim());

        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = cleanValue(columns[index] ?? "");
        });

        const rawChatID = row["chatID"] ?? row["ChatID"] ?? "";

        return {
          TaskID: taskId,
          Agent: agent,
          Engine: engine,
          TurnID: "1",
          PerfData: "{}",
          ...row,
          QueryID: row["oid"] ?? row["OID"] ?? "", // fallback
           ChatID: rawChatID,
        };
      });

    

      const validData = dataObjects.filter(
        (row) => Object.keys(row).length > 0
      );

      console.log('validData',validData)

      setCSVData(validData as any[]);
      await createTableAndSaveData(validData);
      await refreshQueryData();

      setSubmitted(true);
    };
      reader.readAsText(file);
  }
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
                <option value={AIEngine.ClaudePro}>Claude Pro</option>
                <option value={AIEngine.ClaudeO}>Claude Opus</option>
                <option value={AIEngine.Gemini}>Gemini</option>
                <option value={AIEngine.M365}>M365</option>
              </select>
            </div>
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
