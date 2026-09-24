import { buttonClass } from "./ui";

export default function Button({ variant, size, full, className, ...props }) {
  return <button className={buttonClass({ variant, size, full, className })} {...props} />;
}
