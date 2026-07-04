import axiosClient from "../axios/axiosClient";
import countries from "world-countries";

const USER_API_PREFIX = "/api/users";

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

export const changeCurrentUserPassword = async (payload = {}) => {
  const response = await axiosClient.patch(
    `${USER_API_PREFIX}/me/change-password`,
    {
      currentPassword: payload.currentPassword ?? "",
      newPassword: payload.newPassword ?? "",
      confirmPassword: payload.confirmPassword ?? "",
    }
  );

  return response?.data ?? null;
};

export const getCountryOptions = async (signal) => {
  void signal;

  return countries
    .map((country) => ({
      name: country.name.common,
      officialName: country.name.official,
      code: country.cca2,
      code3: country.cca3,
      flag: country.flag,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
};
