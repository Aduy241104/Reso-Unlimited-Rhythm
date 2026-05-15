import { z } from "zod";

const optionalHttpUrl = z
  .string()
  .max(2000)
  .superRefine((value, ctx) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    try {
      const parsed = new URL(trimmed);

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Use an http or https link.",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid URL or leave the field blank.",
      });
    }
  });

export const artistProfileEditSchema = z.object({
  name: z.string().trim().min(1, "Display name is required.").max(120),
  bio: z.string().max(5000, "Bio must be at most 5000 characters."),
  socialFacebook: optionalHttpUrl,
  socialInstagram: optionalHttpUrl,
  socialYoutube: optionalHttpUrl,
});
