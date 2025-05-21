import "./Button.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{
  buttonText?: string;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const Button = ({ buttonText, className, onClick, children }: ButtonProps) => {
  return (
    <button 
      type="button" 
      className={className ? className : "button-container"} 
      onClick={onClick}
    >
      {children || buttonText}
    </button>
  );
};

export default Button;
