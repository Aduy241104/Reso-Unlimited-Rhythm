import { notification } from "antd";

const DEFAULT_CONFIG = {
  placement: "topRight",
  duration: 4.5,
};

const renderDescription = (description) => (
  <span className="whitespace-pre-line">{description}</span>
);

const getNotificationKey = (type, description) =>
  `artist-notification:${type}:${String(description ?? "").trim()}`;

export const showArtistSuccess = (description) => {
  notification.success({
    ...DEFAULT_CONFIG,
    key: getNotificationKey("success", description),
    title: "Thành công",
    description: renderDescription(description),
  });
};

export const showArtistError = (description) => {
  notification.error({
    ...DEFAULT_CONFIG,
    key: getNotificationKey("error", description),
    title: "Không thể thực hiện",
    description: renderDescription(description),
  });
};

export const showArtistInfo = (description) => {
  notification.info({
    ...DEFAULT_CONFIG,
    key: getNotificationKey("info", description),
    title: "Thông báo",
    description: renderDescription(description),
  });
};

export const showArtistWarning = (description) => {
  notification.warning({
    ...DEFAULT_CONFIG,
    key: getNotificationKey("warning", description),
    title: "Cần lưu ý",
    description: renderDescription(description),
  });
};
