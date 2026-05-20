const COUNTRY_OPTIONS_API_URL =
  "https://restcountries.com/v3.1/all?fields=name";

let cachedCountryOptions = null;
let countryOptionsPromise = null;

const normalizeCountryOptions = (countries) => {
  const countryMap = new Map();

  countries.forEach((country) => {
    const countryName = country?.name?.common?.trim();

    if (!countryName) {
      return;
    }

    countryMap.set(countryName.toLowerCase(), countryName);
  });

  return Array.from(countryMap.values()).sort((left, right) =>
    left.localeCompare(right)
  );
};

export const fetchCountryOptions = async () => {
  if (cachedCountryOptions) {
    return cachedCountryOptions;
  }

  if (!countryOptionsPromise) {
    countryOptionsPromise = fetch(COUNTRY_OPTIONS_API_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load country options.");
        }

        return response.json();
      })
      .then((payload) => {
        const normalizedOptions = normalizeCountryOptions(payload);

        cachedCountryOptions = normalizedOptions;

        return normalizedOptions;
      })
      .finally(() => {
        countryOptionsPromise = null;
      });
  }

  return countryOptionsPromise;
};

export { COUNTRY_OPTIONS_API_URL };
