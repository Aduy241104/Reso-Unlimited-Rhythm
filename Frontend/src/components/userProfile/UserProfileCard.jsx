/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const EMPTY_PROFILE = {
  email: "",
  avatar: "",
  fullName: "",
  gender: "",
  country: "",
  dateOfBirth: "",
  authProvider: "",
  canChangePassword: null,
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

const normalizeBoolean = (value) => {
  if (typeof value !== "boolean") {
    return null;
  }

  return value;
};

export const createUserProfileSnapshot = (source) => {
  if (!source) {
    return { ...EMPTY_PROFILE };
  }

  const nestedProfile = source.profile ?? {};
  const authProvider = normalizeText(
    source.authProvider ?? source.provider ?? nestedProfile.authProvider
  ).toLowerCase();
  const explicitCanChangePassword = normalizeBoolean(source.canChangePassword);
  const canChangePassword =
    explicitCanChangePassword !== null
      ? explicitCanChangePassword
      : authProvider
        ? authProvider === "local"
        : null;

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
    dateOfBirth: normalizeText(source.dateOfBirth ?? nestedProfile.dateOfBirth),
    authProvider,
    canChangePassword,
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
    dateOfBirth: incomingSnapshot.dateOfBirth || currentSnapshot.dateOfBirth,
    authProvider: incomingSnapshot.authProvider || currentSnapshot.authProvider,
    canChangePassword:
      incomingSnapshot.canChangePassword !== null
        ? incomingSnapshot.canChangePassword
        : currentSnapshot.canChangePassword,
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
