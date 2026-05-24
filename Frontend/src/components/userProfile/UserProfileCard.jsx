const UserProfileCard = ({ children }) => {
  return (
    <section
      className="
        relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5
        shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md
      "
    >
      <div className="pointer-events-none absolute -left-20 top-8 h-40 w-40 rounded-full bg-[#ff9f43]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#ff9f43]/10 blur-3xl" />
      <div
        className="
          relative bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]
          p-6 sm:p-8 lg:p-10
        "
      >
        {children}
      </div>
    </section>
  );
};

export default UserProfileCard;
