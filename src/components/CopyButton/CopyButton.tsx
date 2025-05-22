import Button from '../Button/Button';
import './CopyButton.css';
import { FaCopy } from "react-icons/fa";

type CopyButtonProps = {
  value: string;
};
const CopyButton: React.FC<CopyButtonProps> = ({ value }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value || "");
  };

  return (
    <Button onClick={handleCopy} className="copy-button">
      <FaCopy color="#c929292"  />
    </Button>
  );
};

export default CopyButton;