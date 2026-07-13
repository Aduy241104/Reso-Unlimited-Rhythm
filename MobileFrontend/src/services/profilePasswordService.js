import axiosClient from '../api/axiosClient';

const CHANGE_PASSWORD_ENDPOINT = '/users/me/change-password';

const createPasswordDraft = () => ({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const normalizeMessage = (value) => String(value || '').trim().toLowerCase();

const translateChangePasswordError = (error, fallback = 'Không thể đổi mật khẩu lúc này.') => {
  const backendMessage = error?.response?.data?.message || error?.message || '';
  const normalizedMessage = normalizeMessage(backendMessage);

  const dictionary = {
    'current password is incorrect.': 'Mật khẩu hiện tại không đúng.',
    'current password is incorrect': 'Mật khẩu hiện tại không đúng.',
    'current password incorrect': 'Mật khẩu hiện tại không đúng.',
    'confirm password does not match.': 'Mật khẩu xác nhận không khớp.',
    'confirm password does not match': 'Mật khẩu xác nhận không khớp.',
    'new password must be different from the current password.': 'Mật khẩu mới phải khác mật khẩu hiện tại.',
    'new password must be different from the current password': 'Mật khẩu mới phải khác mật khẩu hiện tại.',
    'new password must be at least 8 characters long.': 'Mật khẩu mới phải có ít nhất 8 ký tự.',
    'new password must be at least 8 characters long': 'Mật khẩu mới phải có ít nhất 8 ký tự.',
    'new password must contain at least 1 uppercase letter.': 'Mật khẩu mới phải có ít nhất 1 chữ hoa.',
    'new password must contain at least 1 uppercase letter': 'Mật khẩu mới phải có ít nhất 1 chữ hoa.',
    'new password must contain at least 1 digit.': 'Mật khẩu mới phải có ít nhất 1 chữ số.',
    'new password must contain at least 1 digit': 'Mật khẩu mới phải có ít nhất 1 chữ số.',
    'new password must contain at least 1 special character.': 'Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt.',
    'new password must contain at least 1 special character': 'Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt.',
  };

  return dictionary[normalizedMessage] || backendMessage || fallback;
};

const validatePasswordDraft = (draft = {}) => {
  const currentPassword = String(draft?.currentPassword || '');
  const newPassword = String(draft?.newPassword || '');
  const confirmPassword = String(draft?.confirmPassword || '');
  const errors = {};

  if (!currentPassword.trim()) {
    errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
  }

  if (!newPassword.trim()) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
  } else {
    if (newPassword.length < 8) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 1 chữ hoa.';
    } else if (!/\d/.test(newPassword)) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 1 chữ số.';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt.';
    }
  }

  if (!confirmPassword.trim()) {
    errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  }

  if (!errors.newPassword && currentPassword && newPassword && currentPassword === newPassword) {
    errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  }

  return errors;
};

export const profilePasswordService = {
  createPasswordDraft,
  translateChangePasswordError,
  validatePasswordDraft,

  async changeMyPassword(draft = {}) {
    const payload = {
      currentPassword: String(draft?.currentPassword || ''),
      newPassword: String(draft?.newPassword || ''),
      confirmPassword: String(draft?.confirmPassword || ''),
    };

    return axiosClient.patch(CHANGE_PASSWORD_ENDPOINT, payload);
  },
};

export default profilePasswordService;
