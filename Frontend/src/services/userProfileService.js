import axiosClient from "../axios/axiosClient";

const USER_API_PREFIX = "/api/users";
const COUNTRIES_API_URL =
  "https://restcountries.com/v3.1/all?fields=name,flag,flags,cca2,cca3";

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

export const getCurrentUserProfile = async () => {
  const response = await axiosClient.get(`${USER_API_PREFIX}/me`);
  return response?.data?.data?.user ?? null;
};

export const updateCurrentUserProfile = async (payload = {}) => {
  const formData = new FormData();
  const normalizedFullName = normalizeText(payload.fullName);

  if (payload.avatar instanceof File) {
    formData.append("avatar", payload.avatar);
  }

  formData.append("fullName", normalizedFullName);
  formData.append("fullname", normalizedFullName);
  formData.append("gender", normalizeText(payload.gender).toLowerCase());
  formData.append("country", normalizeText(payload.country));

  const response = await axiosClient.patch(`${USER_API_PREFIX}/me`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response?.data?.data?.user ?? null;
};

export const getCountryOptions = async (signal) => {
  const response = await fetch(COUNTRIES_API_URL, { signal });

  if (!response.ok) {
    throw new Error("Unable to load countries right now.");
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((country) => ({
      code: normalizeText(country?.cca2 || country?.cca3),
      name: normalizeText(country?.name?.common),
      officialName: normalizeText(country?.name?.official),
      flag: normalizeText(country?.flag) || normalizeText(country?.flags?.emoji),
    }))
    .filter((country) => country.name)
    .sort((left, right) => left.name.localeCompare(right.name));
};
