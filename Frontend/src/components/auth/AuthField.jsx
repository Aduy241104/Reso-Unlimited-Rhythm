const AuthField = ({
  label,
  error,
  helperText,
  className = "",
  theme = "light",
  ...props
}) => {
  const isDark = theme === "dark";

  return (
    <label className={`block ${className}`}>
      <span
        className={`mb-2 block text-sm font-medium ${
          isDark ? "text-[#efe7dc]" : "text-slate-800"
        }`}
      >
        {label}
      </span>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
          error
            ? isDark
              ? "border-rose-300/70 bg-[#1a1620] text-white ring-4 ring-rose-500/15"
              : "border-rose-300 bg-slate-50 text-slate-950 ring-4 ring-rose-100"
            : isDark
              ? "border-[#f0dcc8]/15 bg-[#f7f4f1] text-[#1a1820] placeholder:text-[#9a8fa8] focus:border-[#f5b66f] focus:bg-[#fcfaf8] focus:ring-4 focus:ring-[#f5b66f]/20"
              : "border-slate-200 bg-slate-50 text-slate-950 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
        }`}
      />
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
