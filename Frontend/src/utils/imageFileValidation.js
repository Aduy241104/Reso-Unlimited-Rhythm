const BASE_IMAGE_FORMATS = [
  { mimeTypes: ["image/jpeg", "image/jpg"], extensions: ["jpg", "jpeg"] },
  { mimeTypes: ["image/png"], extensions: ["png"] },
  { mimeTypes: ["image/webp"], extensions: ["webp"] },
];

const GIF_IMAGE_FORMAT = {
  mimeTypes: ["image/gif"],
  extensions: ["gif"],
};

export const IMAGE_FILE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const IMAGE_FILE_ACCEPT_WITH_GIF =
  `${IMAGE_FILE_ACCEPT},.gif,image/gif`;

const getFileExtension = (fileName = "") => {
  const normalizedName = String(fileName).trim().toLowerCase();
  const extensionSeparatorIndex = normalizedName.lastIndexOf(".");

  return extensionSeparatorIndex >= 0
    ? normalizedName.slice(extensionSeparatorIndex + 1)
    : "";
};

export const getImageFileValidationError = (
  file,
  { allowGif = false, maxSizeBytes = 0, maxSizeLabel = "" } = {}
) => {
  if (!file) {
    return "";
  }

  const allowedFormats = allowGif
    ? [...BASE_IMAGE_FORMATS, GIF_IMAGE_FORMAT]
    : BASE_IMAGE_FORMATS;
  const mimeType = String(file.type || "").trim().toLowerCase();
  const extension = getFileExtension(file.name);
  const matchingFormat = allowedFormats.find(
    (format) =>
      format.mimeTypes.includes(mimeType) &&
      format.extensions.includes(extension)
  );

  if (!matchingFormat) {
    const allowedFormatText = allowGif
      ? "JPG, JPEG, PNG, WEBP hoặc GIF"
      : "JPG, JPEG, PNG hoặc WEBP";

    return `Tệp "${file.name || "đã chọn"}" không đúng định dạng. Chỉ chấp nhận ${allowedFormatText}.`;
  }

  if (maxSizeBytes > 0 && Number(file.size) > maxSizeBytes) {
    return `Ảnh không được vượt quá ${maxSizeLabel || `${maxSizeBytes} byte`}.`;
  }

  return "";
};

export const getImageFilesValidationError = (files, options) => {
  const normalizedFiles = Array.from(files || []);

  for (const file of normalizedFiles) {
    const errorMessage = getImageFileValidationError(file, options);

    if (errorMessage) {
      return errorMessage;
    }
  }

  return "";
};
