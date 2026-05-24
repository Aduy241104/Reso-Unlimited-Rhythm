import { ChevronRight, Mail, MapPin, UserRound } from "lucide-react";

const ProfileField = ({ icon: Icon, label, value }) => {
  return (
    <div
      className="
        group flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4
        shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-md transition duration-300
        hover:-translate-y-1 hover:border-[#ff9f43]/25 hover:bg-white/[0.07]
        hover:shadow-[0_24px_70px_rgba(0,0,0,0.4)]
      "
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-[#ff9f43]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium leading-6 text-white sm:text-base">
          {value}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-gray-500 transition group-hover:translate-x-1 group-hover:text-[#ffb46a]" aria-hidden />
    </div>
  );
};

const UserProfileInfo = ({ fullName, email, gender, country }) => {
  const fields = [
    { label: "Full Name", value: fullName, icon: UserRound },
    { label: "Email", value: email, icon: Mail },
    { label: "Gender", value: gender, icon: UserRound },
    { label: "Country", value: country, icon: MapPin },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-md sm:p-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#ff9f43]">
          Profile details
        </p>

        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem]">
          Profile Details
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
          Personal information from your authenticated account, presented in a
          clean premium dashboard layout.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <ProfileField
            key={field.label}
            icon={field.icon}
            label={field.label}
            value={field.value}
          />
        ))}
      </div>
    </div>
  );
};

export default UserProfileInfo;
