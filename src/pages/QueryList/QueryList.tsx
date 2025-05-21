import React from "react";
import "./QueryList.css";
import { FaArrowRight } from "react-icons/fa";
import Breadcrumbs from "../../components/Breadcrumbs/Breadcrumbs";

interface QueryListProps {
  data: { OID: string; query: string }[];
  goHome: () => void;
  goChat: (item: { OID: string; query: string }) => void;
}

const QueryList: React.FC<QueryListProps> = ({ data, goHome, goChat }) => {
  return (
    <div className="query-list-container">
      <div className="top-bar">
        <Breadcrumbs showHome showQueryList={false} onHomeClick={goHome} />
        <button className="extract-button">
          Extract
        </button>
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
          {data.map((item,index) => (
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
