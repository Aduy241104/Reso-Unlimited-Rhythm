import * as yup from 'yup';
import { toApiDateValue } from '../utils/artistRegistrationDate';

const MINIMUM_REGISTRATION_AGE = 16;
const REGISTRATION_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];
const REGISTRATION_PASSWORD_REQUIREMENTS =
  'Mật khẩu phải có từ 8 đến 33 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.';

const isValidRegistrationPassword = (value = '') => (
  value.length >= 8 &&
  value.length <= 33 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value)
);

const isOldEnoughToRegister = (value) => {
  const apiDateValue = toApiDateValue(value);

  if (!apiDateValue) {
    return true;
  }

  const selectedDate = new Date(`${apiDateValue}T00:00:00`);
  const maximumBirthDate = new Date();
  maximumBirthDate.setHours(0, 0, 0, 0);
  maximumBirthDate.setFullYear(maximumBirthDate.getFullYear() - MINIMUM_REGISTRATION_AGE);

  return selectedDate <= maximumBirthDate;
};

export const loginSchema = yup.object().shape({
  email: yup.string().required('Email is required').email('Invalid email address'),
  password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = yup.object().shape({
  fullName: yup
    .string()
    .trim()
    .required('Vui lòng nhập họ và tên.')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
  email: yup.string().trim().required('Vui lòng nhập email.').email('Email không đúng định dạng.'),
  gender: yup
    .string()
    .oneOf(REGISTRATION_GENDERS, 'Giới tính không hợp lệ.')
    .required('Vui lòng chọn giới tính.'),
  dateOfBirth: yup
    .string()
    .trim()
    .required('Vui lòng chọn ngày sinh.')
    .test('valid-date', 'Ngày sinh không hợp lệ.', (value) => Boolean(toApiDateValue(value)))
    .test(
      'minimum-age',
      `Bạn phải đủ ${MINIMUM_REGISTRATION_AGE} tuổi để đăng ký tài khoản.`,
      isOldEnoughToRegister
    ),
  password: yup
    .string()
    .required(REGISTRATION_PASSWORD_REQUIREMENTS)
    .test('registration-password', REGISTRATION_PASSWORD_REQUIREMENTS, isValidRegistrationPassword),
  confirmPassword: yup
    .string()
    .required('Vui lòng xác nhận mật khẩu.')
    .oneOf([yup.ref('password')], 'Mật khẩu xác nhận không khớp.'),
});

export const registerOtpSchema = yup.object().shape({
  otp: yup
    .string()
    .trim()
    .required('Vui lòng nhập mã OTP.')
    .matches(/^\d{6}$/, 'Mã OTP phải gồm đúng 6 chữ số.'),
});

export const forgotPasswordSchema = yup.object().shape({
  email: yup.string().trim().required('Email is required').email('Invalid email address'),
});

export const resetPasswordSchema = yup.object().shape({
  otp: yup
    .string()
    .trim()
    .required('OTP is required')
    .matches(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  password: yup.string().required('New password is required').min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('password')], 'Confirm password does not match'),
});
