import "./Breadcrumbs.css";

interface BreadcrumbsProps {
  path: string[];
  onNavigate: (label: string) => void;
}

const Breadcrumbs = ({ path, onNavigate }: BreadcrumbsProps) => {
  return (
    <div className="breadcrumbs">
      {path.map((label, index) => (
        <span key={index}>
          <button
            className="breadcrumb-link"
            onClick={() => onNavigate(label)}
          >
            {label}
          </button>
          {index < path.length - 1 && " / "}
        </span>
      ))}
    </div>
  );
};

export default Breadcrumbs;
