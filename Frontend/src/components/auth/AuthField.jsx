const AuthField = ({ label, error, helperText, className = "", ...props }) => {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </span>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition ${
          error
            ? "border-rose-300 ring-4 ring-rose-100"
            : "border-slate-200 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
        }`}
      />
      {error ? (
        <span className="mt-2 block text-sm text-rose-600">{error}</span>
      ) : helperText ? (
        <span className="mt-2 block text-sm text-slate-500">{helperText}</span>
      ) : null}
    </label>
  );
};

export default AuthField;
