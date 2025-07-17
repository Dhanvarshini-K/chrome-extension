import { useEffect, useMemo, useState } from "react";
import type { QueryItem } from "./types";
import Fuse from "fuse.js";
import { getStorage } from "./utils/localStorage";
import "../src/pages/QueryList/QueryList.css";
import Button from "./components/Button/Button";

interface ValidationProps {
  data: QueryItem[];
  goQueryList: () => void;
}

const ENGINE_ENUM = {
  ChatGptPro: "cgp",
  PplxPro: "pp",
  ClaudePro: "cp",
  GeminiPro: "gp",
  Cplt: "cp",
  BIC: "bic",
  ClaudeS: "clds",
  ClaudeO: "cldo",
};

const RESPONSE_CODE_ENUM = [
  "Success",
  "Error",
  "Skipped",
  "Retry",
  "Throttled",
  "Disengaged",
];

type ValidatedRow = {
  TaskID: string;
  OID: string;
  Query: string;
  ChatId: string;
  Sources: string;
  ResponseText: string;
  ResponseHTML: string;
  ResponseImage: string;
  Agent: string;
  PerfData: string;
  Timestamp: string;
  ResponseCode: string;
  Engine: string;
  validationNotes: string[];
};

const Validation: React.FC<ValidationProps> = ({ data, goQueryList }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedColumn, setSelectedColumn] = useState<string>("");


  const [currentPage, setCurrentPage] = useState(1);

  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const values = await getStorage(["validationCurrentPage"]);

      if (values.validationCurrentPage) {
        setCurrentPage(values.validationCurrentPage);
      }
    };

    fetchData();
    setValidatedData([]);
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ validationCurrentPage: currentPage });
  }, [currentPage]);

// const fuse = useMemo(() => {
//   const keys = Object.keys(data?.[0] || {});
//   return new Fuse(data, {
//     keys,
//     threshold: 0.3,
//     ignoreLocation: true,
//   });
// }, [data]);


const fuse = useMemo(() => {
  const keys =
    selectedColumn && Object.keys(data?.[0] || {}).includes(selectedColumn)
      ? [selectedColumn]
      : Object.keys(data?.[0] || {}); // fallback to all

  return new Fuse(data, {
    keys,
    threshold: 0.3,
    ignoreLocation: true,
  });
}, [data, selectedColumn]);


  const filteredData = searchTerm.trim()
    ? fuse.search(searchTerm).map((result) => result.item)
    : data;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleValidation = () => {
    const results: ValidatedRow[] = data.map((item) => {
      const {
        QueryID: queryId,
        OID: oid,
        Engine: engine,
        ResponseImage: image,
        ResponseCode: responseCode,
      } = item;

      const notes: string[] = [];

      if (queryId !== oid) notes.push("QueryID does not match OID");
      if (!Object.keys(ENGINE_ENUM).includes(engine))
        notes.push("Engine is invalid");
      const prefix = ENGINE_ENUM[engine as keyof typeof ENGINE_ENUM];
      if (image !== `${prefix}${oid}.png`)
        notes.push(`Expected image: ${prefix}${oid}.png`);
      if (!RESPONSE_CODE_ENUM.includes(responseCode))
        notes.push("Invalid ResponseCode");

      return { ...item, validationNotes: notes };
    });

    setValidatedData(results);
  };


  return (
    <>
      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          justifyContent: validatedData?.length ? "flex-start" : "flex-end",
          padding: "10px 20px",
        }}
      >
        {validatedData?.length ? (
          <div style={{ width: "80px" }}>
            <Button onClick={goQueryList} className="back-button ">
              Back
            </Button>
          </div>
        ) : (
          <div style={{ width: "80px" }}>
            <Button onClick={handleValidation}>Validate</Button>
          </div>
        )}
      </div>
      {validatedData?.length ? (
        <>
          <div className="validation-section">
            <h3>Validation Summary</h3>
            <div>
              {validatedData
                .filter((item) => item.validationNotes?.length > 0)
                .map((item, i) => (
                  <p key={i}>
                    <strong>{item.OID}</strong>:{" "}
                    {item.validationNotes.join("; ")}
                  </p>
                ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="search-bar">
                          <select
    value={selectedColumn}
    onChange={(e) => setSelectedColumn(e.target.value)}
  >
    <option value="">Search all columns</option>
    {Object.keys(data?.[0] || {}).map((key) => (
      <option key={key} value={key}>
        {key}
      </option>
    ))}
  </select>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />


          </div>

          <div className="table-wrapper">
            <table className="query-table">
              <thead>
                <tr>
                  {Object.keys(paginatedData?.[0] || {})
                    .filter((key) => key !== "id")
                    .map((key) => (
                      <th key={key}>{key.toUpperCase()}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData?.map((item, rowIndex) => {
                  return (
                    <tr
                      key={item.OID || rowIndex}
                      style={{ verticalAlign: "baseline" }}
                    >
                      {Object.entries(item)
                        .filter(([key]) => key !== "id")
                        .map(([key, value]) => (
                          <td key={key}>{value}</td>
                        ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <div className="items-per-page">
              Show{" "}
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
              >
                {[5, 10, 20].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>{" "}
              entries
            </div>

            <div className="pagination-buttons">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>

              {(() => {
                const maxButtons = 5;
                let startPage = Math.max(
                  currentPage - Math.floor(maxButtons / 2),
                  1
                );
                let endPage = startPage + maxButtons - 1;

                if (endPage > totalPages) {
                  endPage = totalPages;
                  startPage = Math.max(endPage - maxButtons + 1, 1);
                }

                return Array.from(
                  { length: endPage - startPage + 1 },
                  (_, i) => startPage + i
                ).map((page) => (
                  <button
                    key={page}
                    className={page === currentPage ? "active" : ""}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ));
              })()}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Validation;
