import { z } from "zod";
import {
  MINIMUM_REGISTRATION_AGE,
  REGISTRATION_PASSWORD_REQUIREMENTS,
} from "../../constants/authValidation";

const genderOptions = ["male", "female", "other", "prefer_not_to_say"];

const passwordSchema = z.string().refine(
  (value) =>
    value.length >= 8 &&
    value.length <= 33 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value),
  REGISTRATION_PASSWORD_REQUIREMENTS
);

const dateOfBirthSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng chọn ngày sinh.")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Ngày sinh không hợp lệ.",
  })
  .refine((value) => {
    const selectedDate = new Date(`${value}T00:00:00`);
    const maximumBirthDate = new Date();
    maximumBirthDate.setHours(0, 0, 0, 0);
    maximumBirthDate.setFullYear(
      maximumBirthDate.getFullYear() - MINIMUM_REGISTRATION_AGE
    );

    return selectedDate <= maximumBirthDate;
  }, {
    message: `Bạn phải đủ ${MINIMUM_REGISTRATION_AGE} tuổi để đăng ký tài khoản.`,
  });

export const registerDetailsSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập họ và tên.")
      .max(100, "Họ và tên không được vượt quá 100 ký tự."),
    email: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập email.")
      .email("Email không đúng định dạng."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
    gender: z.enum(genderOptions).default("prefer_not_to_say"),
    dateOfBirth: dateOfBirthSchema,
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Mật khẩu xác nhận không khớp.",
      });
    }
  });

export const registerOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Mã OTP phải gồm đúng 6 chữ số."),
});
