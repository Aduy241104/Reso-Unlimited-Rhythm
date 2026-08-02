import { z } from "zod";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";

const optionalHttpUrl = z
  .string()
  .max(
    ARTIST_INPUT_LIMITS.url,
    `Đường dẫn URL tối đa ${ARTIST_INPUT_LIMITS.url} ký tự.`
  )
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
          message: "Vui lòng sử dụng đường dẫn bắt đầu bằng http:// hoặc https://",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập đường dẫn URL hợp lệ hoặc để trống.",
      });
    }
  });

export const artistProfileEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên hiển thị nghệ sĩ.")
    .max(
      ARTIST_INPUT_LIMITS.profileName,
      `Tên nghệ sĩ tối đa ${ARTIST_INPUT_LIMITS.profileName} ký tự.`
    ),
  bio: z
    .string()
    .max(
      ARTIST_INPUT_LIMITS.profileBio,
      `Tiểu sử nghệ sĩ tối đa ${ARTIST_INPUT_LIMITS.profileBio} ký tự.`
    ),
  socialFacebook: optionalHttpUrl,
  socialInstagram: optionalHttpUrl,
  socialYoutube: optionalHttpUrl,
  socialTiktok: optionalHttpUrl,
  socialSpotify: optionalHttpUrl,
  socialSoundcloud: optionalHttpUrl,
  socialWebsite: optionalHttpUrl,
  socialTwitter: optionalHttpUrl,
  socialOther: optionalHttpUrl,
});
