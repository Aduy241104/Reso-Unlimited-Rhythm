const DATE_VALUE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;
const API_DATE_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const DATE_PICKER_MIN_YEAR = 1900;
export const DATE_PICKER_MAX_YEAR = new Date().getFullYear();
export const DATE_PICKER_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
export const DATE_PICKER_MONTH_LABELS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

const toSafeNumber = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getDaysInMonth = (month, year) => {
  const safeMonth = Math.min(Math.max(toSafeNumber(month, 1), 1), 12);
  const safeYear = Math.min(
    Math.max(toSafeNumber(year, DATE_PICKER_MAX_YEAR), DATE_PICKER_MIN_YEAR),
    DATE_PICKER_MAX_YEAR
  );

  return new Date(safeYear, safeMonth, 0).getDate();
};

export const getDatePickerYearOptions = () => (
  Array.from(
    { length: DATE_PICKER_MAX_YEAR - DATE_PICKER_MIN_YEAR + 1 },
    (_, index) => String(DATE_PICKER_MAX_YEAR - index)
  )
);

export const normalizeDatePickerParts = (parts = {}) => {
  const yearNumber = Math.min(
    Math.max(toSafeNumber(parts.year, DATE_PICKER_MAX_YEAR - 18), DATE_PICKER_MIN_YEAR),
    DATE_PICKER_MAX_YEAR
  );
  const monthNumber = Math.min(Math.max(toSafeNumber(parts.month, 1), 1), 12);
  const maxDay = getDaysInMonth(monthNumber, yearNumber);
  const dayNumber = Math.min(Math.max(toSafeNumber(parts.day, 1), 1), maxDay);

  return {
    day: String(dayNumber).padStart(2, '0'),
    month: String(monthNumber).padStart(2, '0'),
    year: String(yearNumber),
  };
};

export const buildDateDisplayValue = (parts = {}) => {
  const normalized = normalizeDatePickerParts(parts);
  return `${normalized.day}-${normalized.month}-${normalized.year}`;
};

export const parseDateDisplayValue = (value = '') => {
  const normalizedValue = String(value || '').trim();
  const match = DATE_VALUE_PATTERN.exec(normalizedValue);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const normalizedParts = normalizeDatePickerParts({ day, month, year });

  if (
    normalizedParts.day !== day ||
    normalizedParts.month !== month ||
    normalizedParts.year !== year
  ) {
    return null;
  }

  const candidateDate = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (candidateDate.getTime() > today.getTime()) {
    return null;
  }

  return normalizedParts;
};

export const parseAnyDateValue = (value = '') => {
  const displayParts = parseDateDisplayValue(value);

  if (displayParts) {
    return displayParts;
  }

  const normalizedValue = String(value || '').trim();
  const match = API_DATE_VALUE_PATTERN.exec(normalizedValue);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return parseDateDisplayValue(`${day}-${month}-${year}`);
};

export const isDateDisplayValueValid = (value = '') => Boolean(parseDateDisplayValue(value));

export const createDatePickerParts = (value = '') => {
  const parsed = parseAnyDateValue(value);

  if (parsed) {
    return parsed;
  }

  return normalizeDatePickerParts({
    day: '01',
    month: '01',
    year: String(Math.max(DATE_PICKER_MIN_YEAR, DATE_PICKER_MAX_YEAR - 18)),
  });
};

export const toDisplayDateValue = (value = '') => {
  const parsed = parseAnyDateValue(value);

  if (!parsed) {
    return '';
  }

  return buildDateDisplayValue(parsed);
};

export const toApiDateValue = (value = '') => {
  const parsed = parseAnyDateValue(value);

  if (!parsed) {
    return '';
  }

  return `${parsed.year}-${parsed.month}-${parsed.day}`;
};

export const getDatePickerDayOptions = (month, year) => (
  Array.from({ length: getDaysInMonth(month, year) }, (_, index) => String(index + 1).padStart(2, '0'))
);
