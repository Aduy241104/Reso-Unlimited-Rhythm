import { z } from "zod";

const genderOptions = ["male", "female", "other", "prefer_not_to_say"];

const passwordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
  .max(33, "Mật khẩu không được vượt quá 33 ký tự.")
  .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ in hoa.")
  .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường.")
  .regex(/\d/, "Mật khẩu phải có ít nhất 1 chữ số.")
  .regex(/[^A-Za-z0-9]/, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.");

const dateOfBirthSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng chọn ngày sinh.")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Ngày sinh không hợp lệ.",
  })
  .refine((value) => {
    const selectedDate = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selectedDate <= today;
  }, {
    message: "Ngày sinh không được lớn hơn ngày hiện tại.",
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
      .email("Định dạng email không hợp lệ."),
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
