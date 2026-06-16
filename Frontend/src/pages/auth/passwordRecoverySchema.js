import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email.")
    .email("Định dạng email không hợp lệ."),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự.")
      .max(128, "Mật khẩu không được vượt quá 128 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
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
