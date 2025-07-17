import { useMemo, useEffect } from "react";
import "./QueryList.css";
import { FaSpinner } from "react-icons/fa";
import Breadcrumbs from "../../components/Breadcrumbs/Breadcrumbs";
import Button from "../../components/Button/Button";
import { HEADERS, type QueryItem } from "../../types";
import { useState } from "react";
import { DB_NAME } from "../../utils";
import Fuse from "fuse.js";
import { version } from "../../../package.json";
import { getStorage, removeFromStorage } from "../../utils/localStorage";

interface QueryListProps {
  data: QueryItem[];
  goHome: () => void;
  goToValidation: () => void;
  goChat: (item: { OID: string; Query: string; Engine: string }) => void;
  setQueryData: React.Dispatch<React.SetStateAction<QueryItem[]>>;
  refreshQueryData: () => Promise<void>;
}

const QueryList: React.FC<QueryListProps> = ({
  data,
  goHome,
  goChat,
  goToValidation,
  setQueryData,
  refreshQueryData,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [currentPage, setCurrentPage] = useState(1);
  const [agent, setAgent] = useState<string | undefined>(undefined);
  useEffect(() => {
    const fetchData = async () => {
      const values = await getStorage(["queryListCurrentPage", "agent"]);

      if (values.queryListCurrentPage) {
        setCurrentPage(values.queryListCurrentPage);
      }

      if (values.agent) {
        setAgent(values.agent);
      }
    };

    fetchData();
  }, []);
  useEffect(() => {
    chrome.storage.local.set({ queryListCurrentPage: currentPage });
  }, [currentPage]);

  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: ["OID", "Query"],
      threshold: 0.3,
    });
  }, [data]);

  const filteredData = searchTerm.trim()
    ? fuse.search(searchTerm).map((result) => result.item)
    : data;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchTerm]);

  const status = useMemo(() => {
    const allEmpty = data.every(
      (item) =>
        item.ResponseText.trim() === "" && item.ResponseHTML.trim() === ""
    );

    if (allEmpty) return "Not Yet Started";

    const anyEmpty = data.some(
      (item) =>
        item.ResponseText.trim() === "" || item.ResponseHTML.trim() === ""
    );

    if (anyEmpty) return "Pending";

    return "Completed";
  }, [data]);

  async function handleExtract() {
    try {
      if (data?.length === 0) {
        console.error("No data found in IndexedDB.");
        return;
      }

      const rows = data.map((item: any) => {
        const {
          TaskID,
          OID,
          QueryID,
          Agent,
          ResponseCode,
          Engine,
          Query,
          TurnID,
          ChatID,
          Sources,
          ResponseText,
          ResponseHTML,
          ResponseImage,
          TimeStamp,
          PerfData,
        } = item;

        return [
          TaskID,
          OID,
          ChatID || "",
          QueryID,
          TurnID,
          Engine,
          Query,
          ResponseText,
          ResponseHTML,
          Sources === "No citations found." ? "" : Sources,
          ResponseImage,
          ResponseCode,
          PerfData,
          Agent,
          TimeStamp || "",
        ].join("\t");
      });

      const tsvContent = [HEADERS.join("\t"), ...rows].join("\n");

      const blob = new Blob([tsvContent], {
        type: "text/tab-separated-values;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "output.tsv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error in handleExtract:", error);
    }
  }

  function handleClearQueryList() {
    setShowModal(true);
  }

  async function confirmClear() {
    setIsDeleting(true);

    try {
      // Close existing open connections before deleting
      const openRequest = indexedDB.open(DB_NAME);

      openRequest.onsuccess = () => {
        const db = openRequest.result;
        db.close(); // Close the DB connection immediately

        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

        deleteRequest.onsuccess = async () => {
          console.log("DB deleted successfully");
          setQueryData([]);
          setIsDeleting(false);
          setShowModal(false);
          await refreshQueryData();
          await removeFromStorage([
            "agent",
            "engine",
            "taskId",
            "fileType",
            "submitted",
            "fileName",
          ]);

          goHome();
        };

        deleteRequest.onerror = () => {
          console.error("Error deleting DB:", deleteRequest.error);
          setIsDeleting(false);
        };

        deleteRequest.onblocked = () => {
          console.warn("Delete blocked");
          setIsDeleting(false);
        };
      };

      openRequest.onerror = () => {
        console.error("Error opening DB:", openRequest.error);
        setIsDeleting(false);
      };
    } catch (err) {
      console.error("Exception deleting DB:", err);
      setIsDeleting(false);
    }
  }

  function cancelClear() {
    setShowModal(false);
  }

  function goQueryDetails(item: QueryItem) {
    return goChat({
      OID: item.OID,
      Query: item.Query,
      Engine: item.Engine,
    });
  }

  return (
    <div className="query-list-container">
      <div className="top-bar">
        <Breadcrumbs
          showHome
          showQueryList={false}
          onHomeClick={goHome}
          currentPageLabel="QueryList"
        />

        <div className="agent-dropdown">
          <button
            className="agent-label"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            {agent} ▾
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu">
              <Button onClick={goToValidation}>Validation</Button>
              <Button onClick={handleExtract}>Extract</Button>
              <Button
                className="clear-button danger"
                onClick={handleClearQueryList}
              >
                Clear Query List
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className={`${isDropdownOpen ? "blurred" : ""}`}>
        <div className="query-container">
          <div
            className={`status-summary ${
              status == "Completed"
                ? "completed"
                : status === "Pending"
                ? "pending"
                : "notYetStarted"
            }`}
          >
            {`Status : ${status}`}
          </div>
        </div>
        <p>
          <span style={{ fontWeight: "bold" }}>Version:</span> {version}
        </p>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by OID or Query..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <table className="query-table">
            <thead>
              <tr>
                <th>S.NO</th>
                <th>OID</th>
                <th>QUERY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData?.map((item, index) => (
                <tr key={item.OID}>
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td
                    className="clickable-cell"
                    onClick={() => goQueryDetails(item)}
                  >
                    {item.OID}
                  </td>
                  <td
                    className="query-cell clickable-cell"
                    onClick={() => goQueryDetails(item)}
                  >
                    {item.Query}
                  </td>
                  <td>{item.ResponseCode === "Success" ? "✅" : ""}</td>
                </tr>
              ))}
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
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>⚠️ Are you sure you want to reset the query set?</h3>
            <div className="modal-buttons">
              <button
                onClick={cancelClear}
                className="modal-cancel"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="modal-ok"
                disabled={isDeleting}
              >
                {isDeleting ? <FaSpinner className="spinner" /> : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryList;
