export const REVIEW_CRITERIA = [
  { key: "profileComplete", label: "Hồ sơ đầy đủ" },
  { key: "identityVerified", label: "Xác thực danh tính" },
  { key: "hasMusicActivity", label: "Có hoạt động âm nhạc" },
  { key: "socialLinksValid", label: "Liên kết hợp lệ" },
  { key: "noImpersonation", label: "Không mạo danh" },
  { key: "acceptedCopyrightPolicy", label: "Chấp nhận chính sách bản quyền" },
];

export const createEmptyChecklist = () =>
  REVIEW_CRITERIA.reduce((result, item) => {
    result[item.key] = null;
    return result;
  }, {});
