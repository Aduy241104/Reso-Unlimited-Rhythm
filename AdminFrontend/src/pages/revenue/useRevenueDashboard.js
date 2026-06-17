import { useEffect, useState } from "react";
import { fetchRevenueSnapshots, getErrorMessage } from "./utils";

export const useRevenueDashboard = (selectedYear, selectedMonth) => {
  const [dashboard, setDashboard] = useState(null);
  const [previousDashboard, setPreviousDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError("");

      try {
        const { currentData, previousData } = await fetchRevenueSnapshots(
          selectedYear,
          selectedMonth
        );

        if (!isActive) return;

        setDashboard(currentData);
        setPreviousDashboard(previousData);
      } catch (apiError) {
        if (!isActive) return;
        setError(getErrorMessage(apiError));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const interval = setInterval(() => {
      void (async () => {
        setIsRefreshing(true);

        try {
          const { currentData, previousData } = await fetchRevenueSnapshots(
            selectedYear,
            selectedMonth
          );

          setDashboard(currentData);
          setPreviousDashboard(previousData);
        } catch {
          // Keep existing data on background refresh failure.
        } finally {
          setIsRefreshing(false);
        }
      })();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedYear, selectedMonth]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError("");

    try {
      const { currentData, previousData } = await fetchRevenueSnapshots(
        selectedYear,
        selectedMonth
      );

      setDashboard(currentData);
      setPreviousDashboard(previousData);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    dashboard,
    previousDashboard,
    isLoading,
    isRefreshing,
    error,
    handleRefresh,
  };
};

export default useRevenueDashboard;
