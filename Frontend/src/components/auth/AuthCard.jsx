const AuthCard = ({ title, subtitle, children, footer }) => {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500" />

      <div className="relative">
        <header className="mb-8">
          <p className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Capstone Account
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
              {subtitle}
            </p>
          ) : null}
        </header>

        {children}

        {footer ? <footer className="mt-6 text-sm text-slate-600">{footer}</footer> : null}
      </div>
    </section>
  );
};

export default AuthCard;
