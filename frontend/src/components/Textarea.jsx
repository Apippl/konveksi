import { textareaClass } from "./ui";

export default function Textarea({ className = "", ...props }) {
  return <textarea className={`${textareaClass} ${className}`} {...props} />;
}
