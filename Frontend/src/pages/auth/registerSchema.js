import { z } from "zod";

export const registerDetailsSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .max(100, "Họ và tên tối đa 100 ký tự."),
    email: z
      .string()
      .trim()
      .min(1, "Email là bắt buộc.")
      .email("Email không đúng định dạng."),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự.")
      .max(128, "Mật khẩu không được vượt quá 128 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Mật khẩu nhập lại chưa khớp.",
      });
    }
  });

export const registerOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP phải gồm đúng 6 chữ số."),
});
