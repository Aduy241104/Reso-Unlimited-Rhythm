/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const EMPTY_PROFILE = {
  email: "",
  avatar: "",
  fullName: "",
  gender: "",
  country: "",
};

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeGenderValue = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase().replace(/\s+/g, "_");

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue === "male" || normalizedValue === "female") {
    return normalizedValue;
  }

  return normalizedValue === "other" ? "other" : normalizedValue;
};

export const createUserProfileSnapshot = (source) => {
  if (!source) {
    return { ...EMPTY_PROFILE };
  }

  const nestedProfile = source.profile ?? {};

  return {
    email: normalizeText(source.email),
    avatar: normalizeText(source.avatar),
    fullName: normalizeText(
      source.fullName ??
        source.fullname ??
        nestedProfile.fullName ??
        nestedProfile.fullname
    ),
    gender: normalizeGenderValue(source.gender ?? nestedProfile.gender),
    country: normalizeText(source.country ?? nestedProfile.country),
  };
};

export const mergeUserProfileSnapshot = (current, incoming) => {
  const currentSnapshot = current ? createUserProfileSnapshot(current) : { ...EMPTY_PROFILE };
  const incomingSnapshot = createUserProfileSnapshot(incoming);

  return {
    email: incomingSnapshot.email || currentSnapshot.email,
    avatar: incomingSnapshot.avatar || currentSnapshot.avatar,
    fullName: incomingSnapshot.fullName || currentSnapshot.fullName,
    gender: incomingSnapshot.gender || currentSnapshot.gender,
    country: incomingSnapshot.country || currentSnapshot.country,
  };
};

const UserProfileCardContext = createContext({
  profile: null,
  setProfile: () => undefined,
});

export const useUserProfileCard = () => useContext(UserProfileCardContext);

const UserProfileCard = ({ children }) => {
  const [profile, setProfile] = useState(null);

  return (
    <UserProfileCardContext.Provider value={{ profile, setProfile }}>
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
    </UserProfileCardContext.Provider>
  );
};

export default UserProfileCard;
