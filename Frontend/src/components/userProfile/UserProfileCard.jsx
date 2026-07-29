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
      <section className="mt-6">{children}</section>
    </UserProfileCardContext.Provider>
  );
};

export default UserProfileCard;
