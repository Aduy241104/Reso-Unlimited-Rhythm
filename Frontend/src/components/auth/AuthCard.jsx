const AuthCard = ({
  title,
  subtitle,
  children,
  footer,
  theme = "light",
  className = "",
  headerClassName = "",
  footerClassName = "",
}) => {
  const isDark = theme === "dark";

  return (
    <section
      className={`relative overflow-hidden rounded-2xl p-5 backdrop-blur sm:p-6 lg:p-7 ${
        isDark
          ? "border border-white/10 bg-[#121118]/88 shadow-[0_24px_70px_rgba(0,0,0,0.34)]"
          : "border border-white/60 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.14)]"
      } ${className}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-px ${
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
        <header className={`mb-5 ${headerClassName}`}>
          <div
            className={`mb-3 h-px w-14 ${
              isDark ? "bg-[#f5b66f]/70" : "bg-cyan-500/70"
            }`}
          />
          <h1
            className={`text-2xl font-semibold tracking-tight sm:text-3xl ${
              isDark ? "text-white" : "text-slate-950"
            }`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={`mt-3 max-w-xl text-sm leading-6 ${
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
            className={`mt-5 text-sm ${isDark ? "text-[#d9d5cf]" : "text-slate-600"} ${footerClassName}`}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </section>
  );
};

export default AuthCard;
