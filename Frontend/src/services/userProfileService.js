import axiosClient from "../axios/axiosClient";

const USER_API_PREFIX = "/api/users";
const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AT", "AU", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN", "BO", "BR",
  "BS", "BT", "BW", "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI", "CL",
  "CM", "CN", "CO", "CR", "CU", "CV", "CY", "CZ", "DE", "DJ", "DK", "DM",
  "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET", "FI", "FJ", "FM", "FR",
  "GA", "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW", "GY",
  "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IN", "IQ", "IR", "IS",
  "IT", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR",
  "KW", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV",
  "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MR",
  "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NE", "NG", "NI", "NL",
  "NO", "NP", "NR", "NZ", "OM", "PA", "PE", "PG", "PH", "PK", "PL", "PT",
  "PW", "PY", "QA", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE",
  "SG", "SI", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SY",
  "TD", "TG", "TH", "TJ", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW",
  "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VN", "VU", "WS",
  "YE", "ZA", "ZM", "ZW",
];

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

const getCountryFlag = (countryCode) =>
  String(countryCode || "")
    .toUpperCase()
    .replace(/./g, (character) =>
      String.fromCodePoint(127397 + character.charCodeAt(0))
    );

const createAbortError = () => {
  if (typeof DOMException === "function") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
};

export const getCountryOptions = async (signal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }

  const displayNames =
    typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;

  return COUNTRY_CODES
    .map((countryCode) => {
      const countryName = displayNames?.of(countryCode) || countryCode;

      return {
        name: countryName,
        officialName: countryName,
        code: countryCode,
        code3: "",
        flag: getCountryFlag(countryCode),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
};
