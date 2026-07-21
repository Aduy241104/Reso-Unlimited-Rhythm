import { useEffect, useState } from "react";
import DailyTopArtistsSection from "../../components/home/DailyTopArtistsSection";
import {
  getDailyTopArtistsService,
  getMonthlyTopArtistsService,
} from "../../services/artistBrowseService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  DAILY_TOP_ARTISTS_DATE,
  DAILY_TOP_ARTISTS_LIMIT,
  MONTHLY_TOP_ARTISTS_DATE,
} from "../../utils/homePageCache";
import { MONTHLY_TOP_ARTISTS_LIMIT } from "../../utils/monthlyTopArtists";

const PERIOD_CONFIG = {
  daily: {
    title: "Top nghệ sĩ theo ngày",
    description: "Bảng xếp hạng những nghệ sĩ được nghe nhiều nhất trong ngày.",
    errorMessage: "Không thể tải bảng xếp hạng nghệ sĩ theo ngày lúc này.",
    emptyMessage: "Chưa có dữ liệu xếp hạng nghệ sĩ cho ngày này.",
    load: () =>
      getDailyTopArtistsService({
        date: DAILY_TOP_ARTISTS_DATE,
        limit: DAILY_TOP_ARTISTS_LIMIT,
      }),
  },
  monthly: {
    title: "Top nghệ sĩ theo tháng",
    description: "Bảng xếp hạng những nghệ sĩ được nghe nhiều nhất trong tháng.",
    errorMessage: "Không thể tải bảng xếp hạng nghệ sĩ theo tháng lúc này.",
    emptyMessage: "Chưa có dữ liệu xếp hạng nghệ sĩ cho tháng này.",
    load: () =>
      getMonthlyTopArtistsService({
        month: MONTHLY_TOP_ARTISTS_DATE,
        limit: MONTHLY_TOP_ARTISTS_LIMIT,
      }),
  },
};

const TopArtistsPage = ({ period = "daily" }) => {
  const config = PERIOD_CONFIG[period] || PERIOD_CONFIG.daily;
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadArtists = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await config.load();

        if (isMounted) {
          setArtists(response?.topArtists || []);
        }
      } catch (error) {
        if (isMounted) {
          setArtists([]);
          setErrorMessage(getApiErrorMessage(error, config.errorMessage));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadArtists();

    return () => {
      isMounted = false;
    };
  }, [config]);

  return (
    <section className="min-w-0 p-5 sm:p-7 lg:p-10">
      <DailyTopArtistsSection
        title={ config.title }
        description={ config.description }
        items={ artists }
        isLoading={ isLoading }
        errorMessage={ errorMessage }
        emptyMessage={ config.emptyMessage }
      />
    </section>
  );
};

export default TopArtistsPage;
