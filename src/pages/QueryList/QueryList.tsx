import React from "react";
import "./QueryList.css";
import { FaArrowRight } from "react-icons/fa";
import Breadcrumbs from "../../components/Breadcrumbs/Breadcrumbs";
import Button from "../../components/button/Button";
import { getAllFromIndexedDB } from "../../helpers/indexedDB/indexedDB";

interface QueryListProps {
  data: { OID: string; query: string }[];
  goHome: () => void;
  goChat: (item: { OID: string; query: string }) => void;
}

const QueryList: React.FC<QueryListProps> = ({ data, goHome, goChat }) => {

  async function handleExtract() {
    try {
      const allData = await getAllFromIndexedDB();

      if (allData.length === 0) {
        console.error("No data found in IndexedDB.");
        return;
      }

      const headers = [
        "chatid",
        "responseText",
        "responseHTML",
        "sources",
        "responseImage",
        "perfdata",
        "agent",
        "timestamp",
      ];


      const rows = allData.map((data: any) => {
        const { chatId, citations, responseText, responseHTML, timestamp } =
          data;
        return [
          chatId || "",
          responseText,
          responseHTML,
          citations || "",
          "6.png",
          "{}",
          "v-bvenkatesa",
          timestamp || "",
        ].join("\t");
      });

      const tsvContent = [headers.join("\t"), ...rows].join("\n");

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

  return (
    <div className="query-list-container">
      <div className="top-bar">
        <Breadcrumbs showHome showQueryList={false} onHomeClick={goHome} />
        <Button
        className="extract-button"
          onClick={handleExtract}
        >
          Extract
        </Button>
        <div className="status-summary">
          Pending: {data.length} | Complete: 0
        </div>
      </div>

      <h2 className="query-title">Query Data List</h2>

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
          {data.map((item, index) => (
            <tr key={item.OID}>
              <td>{item.OID}</td>
              <td>{item.query}</td>
              <td>
                <FaArrowRight
                  onClick={() => goChat(data[index])}
                  className="arrow-icon"
                  style={{ cursor: "pointer" }}
                />
              </td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QueryList;
