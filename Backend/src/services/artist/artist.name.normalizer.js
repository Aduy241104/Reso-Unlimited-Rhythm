export const normalizeArtistName = (value) =>
    String(value ?? "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("vi-VN");

export default normalizeArtistName;
