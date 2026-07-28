const RevenueArtistAvatar = ({ name, avatar }) => {
  const initial = name?.charAt(0)?.toUpperCase() || "A";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-11 w-11 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
      {initial}
    </div>
  );
};

export default RevenueArtistAvatar;
