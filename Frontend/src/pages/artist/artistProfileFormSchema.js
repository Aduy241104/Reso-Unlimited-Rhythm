import { z } from "zod";

const optionalHttpUrl = z
  .string()
  .max(500, "Đường dẫn URL tối đa 500 ký tự.")
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
    .max(100, "Tên nghệ sĩ tối đa 100 ký tự."),
  bio: z.string().max(1000, "Tiểu sử nghệ sĩ tối đa 1000 ký tự."),
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
