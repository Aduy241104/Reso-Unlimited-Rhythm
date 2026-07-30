import { notification } from "antd";

const DEFAULT_CONFIG = {
  placement: "topRight",
  duration: 4.5,
};

const renderDescription = (description) => (
  <span className="whitespace-pre-line">{description}</span>
);

export const showArtistSuccess = (description) => {
  notification.success({
    ...DEFAULT_CONFIG,
    message: "Thành công",
    description: renderDescription(description),
  });
};

export const showArtistError = (description) => {
  notification.error({
    ...DEFAULT_CONFIG,
    message: "Không thể thực hiện",
    description: renderDescription(description),
  });
};

export const showArtistInfo = (description) => {
  notification.info({
    ...DEFAULT_CONFIG,
    message: "Thông báo",
    description: renderDescription(description),
  });
};

export const showArtistWarning = (description) => {
  notification.warning({
    ...DEFAULT_CONFIG,
    message: "Cần lưu ý",
    description: renderDescription(description),
  });
};
