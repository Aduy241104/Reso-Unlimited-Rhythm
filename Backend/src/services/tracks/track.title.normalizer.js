export const normalizeTrackTitle = (value) =>
    String(value ?? "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("vi-VN");

export default normalizeTrackTitle;
