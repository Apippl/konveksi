import { cardClass } from "./ui";

export default function Card({ className = "", ...props }) {
  return <div className={`${cardClass} ${className}`} {...props} />;
}
