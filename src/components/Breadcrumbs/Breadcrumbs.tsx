import React from "react";
import { FaHome } from "react-icons/fa";
import "./Breadcrumbs.css";

interface BreadcrumbsProps {
  showHome: boolean;
  showQueryList: boolean;
  onHomeClick: () => void;
  onQueryListClick?: () => void;
  currentPageLabel: string
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  showHome,
  showQueryList,
  onHomeClick,
  onQueryListClick,
  currentPageLabel,
}) => {
  return (
    <div className="breadcrumb-container">
      {showHome && (
        <span className="breadcrumb-item" onClick={onHomeClick}>
          <FaHome size={20} />
        </span>
      )}
      {showQueryList && (
        <div>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item" onClick={onQueryListClick}>
            Query List
          </span>
        </div>
      )}
      {currentPageLabel && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentPageLabel}</span>
        </>
      )}
    </div>
  );
};

export default Breadcrumbs;
