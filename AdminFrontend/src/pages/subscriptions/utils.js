const VND_INTEGER_FORMATTER = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export const getVndDigits = (value) => String(value ?? "").replace(/\D/g, "");

export const formatVndInput = (value) => {
  const digits = getVndDigits(value);

  return digits ? VND_INTEGER_FORMATTER.format(Number(digits)) : "";
};

export const parseVndInput = (value) => {
  const digits = getVndDigits(value);

  return digits ? Number(digits) : Number.NaN;
};

export const handleSyncVndInputChange = (e, onStateChange) => {
  const input = e.target;
  const rawValue = input.value;
  const caretPos = input.selectionStart ?? rawValue.length;

  const digitsBeforeCaret = getVndDigits(rawValue.slice(0, caretPos)).length;
  const rawDigits = getVndDigits(rawValue);

  if (!rawDigits) {
    input.value = "";
    onStateChange("");
    return;
  }

  const formattedValue = formatVndInput(rawDigits);

  let newCaret = 0;
  let digitsSeen = 0;
  while (newCaret < formattedValue.length && digitsSeen < digitsBeforeCaret) {
    if (/\d/.test(formattedValue[newCaret])) {
      digitsSeen++;
    }
    newCaret++;
  }

  input.value = formattedValue;
  try {
    input.setSelectionRange(newCaret, newCaret);
  } catch (_) {
    // Ignore if input type doesn't support selection
  }

  onStateChange(formattedValue);
};
