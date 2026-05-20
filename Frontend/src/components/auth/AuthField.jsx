const AuthField = ({
  as = "input",
  children,
  label,
  error,
  helperText,
  className = "",
  inputClassName = "",
  theme = "light",
  ...props
}) => {
  const isDark = theme === "dark";
  const fieldClassName = `w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition ${
    error
      ? isDark
        ? "border-rose-300/70 bg-[#18141d] text-white ring-4 ring-rose-500/10"
        : "border-rose-300 bg-slate-50 text-slate-950 ring-4 ring-rose-100"
      : isDark
        ? "border-white/10 bg-[#f4efe8] text-[#17131a] placeholder:text-[#8c8092] focus:border-[#f5b66f] focus:bg-[#fcfaf8] focus:ring-4 focus:ring-[#f5b66f]/14"
        : "border-slate-200 bg-slate-50 text-slate-950 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
  } ${inputClassName}`;

  return (
    <label className={`block ${className}`}>
      {label ? (
        <span
          className={`mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] ${
            isDark ? "text-[#bdb3c3]" : "text-slate-800"
          }`}
        >
          {label}
        </span>
      ) : null}
      {as === "select" ? (
        <select
          {...props}
          aria-invalid={Boolean(error)}
          className={fieldClassName}
        >
          {children}
        </select>
      ) : (
        <input
          {...props}
          aria-invalid={Boolean(error)}
          className={fieldClassName}
        />
      )}
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
};

export default AuthField;
