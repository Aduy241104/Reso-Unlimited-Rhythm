import { forwardRef } from "react";

const AuthField = forwardRef(({
  as = "input",
  children,
  label,
  error,
  helperText,
  startAdornment,
  endAdornment,
  className = "",
  labelClassName = "",
  inputWrapperClassName = "",
  inputClassName = "",
  theme = "light",
  ...props
}, ref) => {
  const isDark = theme === "dark";
  const fieldClassName = `w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition ${
    error
      ? isDark
        ? "border-rose-300/70 bg-[#f7f4ef] text-[#17131a] placeholder:text-[#8c8092] ring-4 ring-rose-500/10"
        : "border-rose-300 bg-white text-slate-950 ring-4 ring-rose-100"
      : isDark
        ? "border-white/10 bg-[#f4efe8] text-[#17131a] placeholder:text-[#8c8092] focus:border-[#f5b66f] focus:bg-[#fcfaf8] focus:ring-4 focus:ring-[#f5b66f]/14"
        : "border-black/10 bg-white text-slate-950 placeholder:text-slate-400 focus:border-black focus:ring-4 focus:ring-black/5"
  } ${startAdornment ? "pl-11" : ""} ${endAdornment ? "pr-11" : ""} ${inputClassName}`;

  return (
    <label className={`block ${className}`}>
      {label ? (
        <span
          className={`mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] ${
            isDark ? "text-[#bdb3c3]" : "text-slate-700"
          } ${labelClassName}`}
        >
          {label}
        </span>
      ) : null}

      <div className={`relative ${inputWrapperClassName}`}>
        {startAdornment ? (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {startAdornment}
          </div>
        ) : null}

        {as === "select" ? (
          <select
            {...props}
            aria-invalid={Boolean(error)}
            className={fieldClassName}
            ref={ref}
          >
            {children}
          </select>
        ) : (
          <input
            {...props}
            aria-invalid={Boolean(error)}
            className={fieldClassName}
            ref={ref}
          />
        )}

        {endAdornment ? (
          <div className="absolute inset-y-0 right-3 flex items-center text-slate-400">
            {endAdornment}
          </div>
        ) : null}
      </div>

      {error ? (
        <span className={`mt-2 block text-sm ${isDark ? "text-rose-300" : "text-rose-600"}`}>
          {error}
        </span>
      ) : helperText ? (
        <span
          className={`mt-2 block text-sm ${
            isDark ? "text-[#bfb8ae]" : "text-slate-500"
          }`}
        >
          {helperText}
        </span>
      ) : null}
    </label>
  );
});

AuthField.displayName = "AuthField";

export default AuthField;
