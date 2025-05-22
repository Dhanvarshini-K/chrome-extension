import "./Button.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{
  buttonText?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}


const Button = ({ buttonText, className, onClick, disabled,children }: ButtonProps) => {
  return (
    <button 
      type="button" 
      className={`button-container ${className ? className : ""} ${disabled ? "disabled-button" : ""}`} 
      onClick={onClick}
      disabled = {disabled}
    >
      {children || buttonText}
    </button>
  );
};

export default Button;
