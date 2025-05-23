import React, { useEffect, useState } from "react";
import "./QueryList.css";
import { FaArrowRight, FaSpinner } from "react-icons/fa";
import Breadcrumbs from "../../components/Breadcrumbs/Breadcrumbs";
import Button from "../../components/Button/Button";
import { DB_NAME, getAllFromIndexedDB } from "../../utils/indexedDB";
import { HEADERS } from "../../types/ai.type";

interface QueryListProps {
  data: { OID: string; Query: string }[];
  goHome: () => void;
  goChat: (item: { OID: string; Query: string }) => void;
}

const QueryList: React.FC<QueryListProps> = ({ data, goHome, goChat }) => {
  const [indexedDBData, setIndexedDBData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const allData = await getAllFromIndexedDB();
      setIndexedDBData(allData || []);
    };

    fetchData();
  }, []);

  async function handleExtract() {
    try {
      if (indexedDBData.length === 0) {
        console.error("No data found in IndexedDB.");
        return;
      }

      const rows = indexedDBData.map((data: any) => {
        const {
          OID,
          Agent,
          ResponseCode,
          Engine,
          Query,
          TurnID,
          ChatID,
          Sources,
          ResponseText,
          ResponseHTML,
          TimeStamp,
        } = data;
        return [
          OID,
          ChatID || "",
          TurnID,
          Engine,
          Query,
          ResponseText,
          ResponseHTML,
          Sources || "",
          "6.png",
          ResponseCode,
          "{}",
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

      deleteRequest.onsuccess = () => {
        console.log("DB deleted successfully");
        setIndexedDBData([]);
        setIsDeleting(false);
        setShowModal(false);
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

  return (
    <div className="query-list-container">
      <div className="top-bar">
        <Breadcrumbs showHome showQueryList={false} onHomeClick={goHome} />
        <Button className="extract-button" onClick={handleExtract}>
          Extract
        </Button>

        <div className="status-summary">
          Pending: {data.length} | Complete: 0
        </div>
      </div>
      <div className="query-container">
        <h2 className="query-title">Query Data List</h2>
        <Button className="clear-button danger" onClick={handleClearQueryList}>
          Clear Query List
        </Button>
      </div>
      <table className="query-table">
        <thead>
          <tr>
            <th>OID</th>
            <th>QUERY</th>
            <th>VIEW</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {indexedDBData.map((item, index) => (
            <tr key={item.OID}>
              <td>{item.OID}</td>
              <td>{item.Query}</td>
              <td>
                <FaArrowRight
                  onClick={() => goChat(data[index])}
                  className="arrow-icon"
                />
              </td>
              <td>{item.ResponseCode === "Success" ? "✅" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
