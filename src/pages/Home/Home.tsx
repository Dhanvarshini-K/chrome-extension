import { useState } from "react";
import Button from "../../components/button/Button";
import "./Home.css";
import { setCSVData } from "../../utils";

interface HomeProps {
  goQueryList: () => void
}

const Home = ({goQueryList}: HomeProps) => {
  const [file, setFile] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e?: any) => {
    const selectedFile = e.target.files[0];

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

  const handleSubmit = (e?: any) => {
    console.log("enter")
    e.preventDefault();

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
        .filter((line) => line.trim() !== "") //FILTER OUT EMPTY LINES
        .map((line) => {
          const [OID, ...queryParts] = line.split(",");
          const query = queryParts.join(",").trim();
          return {
            OID: OID.trim(),
            query: query,
          };
        });

      setCSVData(dataObjects);
      goQueryList()
    };

    reader.readAsText(file);
  };

  return (
    <div className="home-container">
      <h2 className="header">Upload Query Data Set</h2>

      <form className="form-container">
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

          <Button buttonText="Submit" onClick={handleSubmit}/>
        </div>
        {error && <div className="errorMessage">{error}</div>}
        {file && <span className="file-name">{file?.name}</span>}
      </form>
    </div>
  );
};

export default Home;
