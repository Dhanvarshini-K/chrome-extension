import "./Button.css";
interface ButtonProps {
    buttonText?: string;
    className?: string;
}

const Button = ({buttonText, className}:ButtonProps) => {
  return (
    <>
      <button type="submit" className={className ? className : "button-container"}>
        {buttonText}
      </button>
    </>
  );
};
export default Button;
