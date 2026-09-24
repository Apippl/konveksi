import { inputClass } from "./ui";

export default function Input({ className = "", ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}
