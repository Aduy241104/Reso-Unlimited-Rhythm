import * as yup from 'yup';

export const loginSchema = yup.object().shape({
  email: yup.string().required('Email is required').email('Invalid email address'),
  password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = yup.object().shape({
  email: yup.string().trim().required('Email is required').email('Invalid email address'),
  password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Confirm password does not match'),
});

export const registerOtpSchema = yup.object().shape({
  otp: yup
    .string()
    .trim()
    .required('OTP is required')
    .matches(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});
