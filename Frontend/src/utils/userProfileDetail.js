const FALLBACK_TEXT = "Chưa cập nhật";

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const formatGenderLabel = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!normalizedValue) {
    return FALLBACK_TEXT;
  }

  const genderLabelMap = {
    male: "Nam",
    female: "Nữ",
    other: "Khác",
    prefer_not_to_say: "Không muốn tiết lộ",
  };

  return genderLabelMap[normalizedValue] || FALLBACK_TEXT;
};

export const getUserProfileDetail = (user) => {
  const email = normalizeText(user?.email);
  const avatar = normalizeText(user?.avatar);
  const fullName = normalizeText(user?.profile?.fullName);
  const country = normalizeText(user?.profile?.country);

  return {
    email: email || FALLBACK_TEXT,
    avatar,
    fullName: fullName || FALLBACK_TEXT,
    gender: formatGenderLabel(user?.profile?.gender),
    country: country || FALLBACK_TEXT,
  };
};
