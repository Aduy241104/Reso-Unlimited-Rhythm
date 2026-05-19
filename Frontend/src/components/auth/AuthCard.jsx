const AuthCard = ({ title, subtitle, children, footer, theme = "light" }) => {
  const isDark = theme === "dark";

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] p-6 backdrop-blur sm:p-8 ${
        isDark
          ? "border border-[#f5b66f]/15 bg-[#121118]/82 shadow-[0_30px_100px_rgba(245,158,66,0.18)]"
          : "border border-white/60 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.14)]"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 ${
          isDark
            ? "bg-gradient-to-r from-[#f5b66f] via-[#d98235] to-[#4f7cff]"
            : "bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500"
        }`}
      />
      {isDark ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,_rgba(255,255,255,0.06)_0%,_rgba(255,255,255,0.012)_28%,_rgba(255,255,255,0.02)_100%)]" />
          <div className="pointer-events-none absolute left-[-3rem] top-[-3rem] h-28 w-28 rounded-full bg-[#ff9f43]/12 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-4rem] right-[-3rem] h-24 w-24 rounded-full bg-[#4f7cff]/12 blur-3xl" />
        </>
      ) : null}

      <div className="relative">
        <header className="mb-8">
          <p
            className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${
              isDark
                ? "border border-[#f5b66f]/20 bg-white/5 text-[#f5b66f]"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            Capstone Account
          </p>
          <h1
            className={`text-3xl font-semibold tracking-tight ${
              isDark ? "text-white" : "text-slate-950"
            }`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={`mt-3 max-w-lg text-sm leading-6 ${
                isDark ? "text-[#d9d5cf]" : "text-slate-600"
              }`}
            >
              {subtitle}
            </p>
          ) : null}
        </header>

        {children}

        {footer ? (
          <footer
            className={`mt-6 text-sm ${isDark ? "text-[#d9d5cf]" : "text-slate-600"}`}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </section>
  );
};

export default AuthCard;
