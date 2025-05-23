import React, { useEffect, useState } from "react";
import "./QueryList.css";
import { FaArrowRight } from "react-icons/fa";
import Breadcrumbs from "../../components/Breadcrumbs/Breadcrumbs";
import Button from "../../components/Button/Button";
import { getAllFromIndexedDB } from "../../utils/indexedDB";
import { HEADERS } from "../../types/ai.type";

interface QueryListProps {
  data: { OID: string; Query: string }[];
  goHome: () => void;
  goChat: (item: { OID: string; Query: string }) => void;
}

const QueryList: React.FC<QueryListProps> = ({ data, goHome, goChat }) => {
   const [indexedDBData, setIndexedDBData] = useState<any[]>([]);


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

  console.log("indexedDBData",indexedDBData);
  

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
              <td>
                {item.ResponseCode === "Success" ? "✅" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QueryList;
