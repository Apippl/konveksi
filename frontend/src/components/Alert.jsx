import { alertClass } from "./ui";

export default function Alert({ variant, className = "", ...props }) {
  return <div className={alertClass({ variant, className })} {...props} />;
}
