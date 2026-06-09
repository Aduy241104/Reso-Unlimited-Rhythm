import { useEffect, useState } from "react";
import { getDailyMixesService } from "../services/recommendationService";
import { getApiErrorMessage } from "../utils/apiError";

export const useRecommendationMixes = ({ enabled = false } = {}) => {
  const [mixes, setMixes] = useState([]);
  const [dateKey, setDateKey] = useState("");
  const [source, setSource] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDailyMixes = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getDailyMixesService();

        if (!isMounted) {
          return;
        }

        setMixes(response.mixes);
        setDateKey(response.dateKey || "");
        setSource(response.source || "");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMixes([]);
        setDateKey("");
        setSource("");
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Khong the tai playlist goi y ca nhan luc nay."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!enabled) {
      setMixes([]);
      setDateKey("");
      setSource("");
      setErrorMessage("");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    void loadDailyMixes();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return {
    mixes,
    dateKey,
    source,
    isLoading,
    errorMessage,
  };
};
