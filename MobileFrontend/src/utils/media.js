export const formatCompactNumber = (value) => {
  const numericValue = Number(value || 0);

  if (numericValue >= 1000000) {
    return `${(numericValue / 1000000).toFixed(1).replace('.0', '')}M`;
  }

  if (numericValue >= 1000) {
    return `${(numericValue / 1000).toFixed(1).replace('.0', '')}K`;
  }

  return `${numericValue}`;
};

export const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${remainingSeconds}s`;
};

export const formatDateLabel = (value) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatMonthLabel = (value) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
};

export const getInitials = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || 'RS';

export const resolveImageUri = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const firstItem = value.find(Boolean);

    if (typeof firstItem === 'string') {
      return firstItem;
    }

    if (firstItem && typeof firstItem.url === 'string') {
      return firstItem.url;
    }
  }

  if (value && typeof value.url === 'string') {
    return value.url;
  }

  return '';
};

export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;
