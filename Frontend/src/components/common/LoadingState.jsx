import { Loader2 } from "lucide-react";

const LoadingState = ({
  message = "Loading...",
  className = "",
  spinnerClassName = "h-6 w-6",
}) => (
  <div
    role="status"
    aria-live="polite"
    className={[
      "flex w-full items-center justify-center gap-3 text-center text-sm font-medium text-white",
      className,
    ]
      .join(" ")
      .trim()}
  >
    <Loader2
      className={["shrink-0 animate-spin text-white", spinnerClassName]
        .join(" ")
        .trim()}
      aria-hidden="true"
    />
    <span>{message}</span>
  </div>
);

export default LoadingState;
