import { useState } from "react";
import Button from "../../components/button/Button";
import "./Home.css";

const Home = () => {
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
    e.preventDefault();

    if (!file) {
      setError("Please select a CSV file before submitting.");
      return;
    }

    console.log("CSV file submitted:", file);
  };

  return (
    <div className="home-container">
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        Upload Query Data Set
      </h2>

      <form onSubmit={handleSubmit} className="form-container">
        <input
          type="file"
          id="csvFileInput"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <div className="data-container">
          <div className="upload-container">
            <label htmlFor="csvFileInput" className="upload-button">
              Upload CSV
            </label>
          </div>

          <Button buttonText="Submit" />
        </div>
        {error && <div className="errorMessage">{error}</div>}
        {file && <span className="file-name">{file?.name}</span>}
      </form>
    </div>
  );
};

export default Home;
