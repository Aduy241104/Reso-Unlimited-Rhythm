import { z } from "zod";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";

const optionalHttpUrl = z
  .string()
  .max(ARTIST_INPUT_LIMITS.url)
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
  name: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(ARTIST_INPUT_LIMITS.profileName),
  bio: z
    .string()
    .max(
      ARTIST_INPUT_LIMITS.profileBio,
      `Bio must be at most ${ARTIST_INPUT_LIMITS.profileBio} characters.`
    ),
  socialFacebook: optionalHttpUrl,
  socialInstagram: optionalHttpUrl,
  socialYoutube: optionalHttpUrl,
});
