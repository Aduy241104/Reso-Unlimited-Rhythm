import { z } from "zod";

const genderOptions = ["male", "female", "other", "prefer_not_to_say"];

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(33, "Password must not exceed 33 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/\d/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.");

const dateOfBirthSchema = z
  .string()
  .trim()
  .min(1, "Date of birth is required.")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Date of birth is invalid.",
  })
  .refine((value) => {
    const selectedDate = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selectedDate <= today;
  }, {
    message: "Date of birth cannot be in the future.",
  });

export const registerDetailsSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required.")
      .max(100, "Full name must be 100 characters or fewer."),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Email format is invalid."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password."),
    gender: z.enum(genderOptions).default("prefer_not_to_say"),
    dateOfBirth: dateOfBirthSchema,
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Password confirmation does not match.",
      });
    }
  });

export const registerOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must contain exactly 6 digits."),
});
