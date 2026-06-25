import { useEffect, useState } from "react";
import { Edit2, Eye, EyeOff, Plus, Search } from "lucide-react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import SubscriptionManagementStatsSection from "./SubscriptionManagementStatsSection";
import SubscriptionPlanStatisticsTab from "./SubscriptionPlanStatisticsTab";
import {
  getPlansService,
  getSubscriptionStatsService,
  updatePlanService,
} from "../../services/subscriptionService";
import { routePaths } from "../../routes/routePaths";

const PLAN_FEATURES = {
  NO_ADS: "Không quảng cáo",
  HIGH_QUALITY_AUDIO: "Chất lượng cao",
  LOSSLESS_AUDIO: "Âm thanh lossless",
  UNLIMITED_SKIP: "Bỏ qua không giới hạn",
  OFFLINE_DOWNLOAD: "Tải offline",
  BACKGROUND_PLAY: "Phát nền",
  AI_SMART_PLAYLIST: "Playlist thông minh AI",
  ADVANCED_RECOMMENDATION: "Đề xuất nâng cao",
  EARLY_ACCESS: "Truy cập sớm",
  EXCLUSIVE_CONTENT: "Nội dung độc quyền",
};

const formatCurrency = (value) => {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const getStatusConfig = (status) => {
  switch (status) {
    case "active":
      return {
        label: "Hoạt động",
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-100",
        dot: "bg-emerald-500",
      };
    case "inactive":
      return {
        label: "Ẩn",
        bg: "bg-slate-50",
        text: "text-slate-500",
        border: "border-slate-200",
        dot: "bg-slate-400",
      };
    default:
      return {
        label: status,
        bg: "bg-slate-50",
        text: "text-slate-500",
        border: "border-slate-200",
        dot: "bg-slate-400",
      };
  }
};

const SubscriptionPlansPage = () => {
  const [activeTab, setActiveTab] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [query, setQuery] = useState({ search: "", status: "", page: 1, limit: 10 });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [hideModal, setHideModal] = useState({
    isOpen: false,
    planId: null,
    planName: "",
    nextStatus: "",
  });

  const loadPlans = async (params = query) => {
    setIsLoading(true);
    setMessage("");

    try {
      const result = await getPlansService({
        search: params.search,
        status: params.status,
        page: params.page,
        limit: params.limit,
      });
      setPlans(result.plans || []);
      setPagination(result.meta);
    } catch (error) {
      setMessage("Không thể tải danh sách gói đăng ký.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getSubscriptionStatsService();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  useEffect(() => {
    void loadPlans(query);
  }, [query]);

  useEffect(() => {
    void loadStats();
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      search: searchTerm.trim(),
      status: filterStatus,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatus("");
    setQuery({ search: "", status: "", page: 1, limit: 10 });
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
  };

  const openHideModal = (planId, planName, nextStatus) => {
    setHideModal({ isOpen: true, planId, planName, nextStatus });
  };

  const closeHideModal = () => {
    setHideModal({ isOpen: false, planId: null, planName: "", nextStatus: "" });
  };

  const handleConfirmHide = async () => {
    if (!hideModal.planId) return;

    setIsUpdatingStatus(true);

    try {
      await updatePlanService(hideModal.planId, { status: hideModal.nextStatus });
      await loadPlans(query);
      void loadStats();
      closeHideModal();
    } catch (error) {
      const nextMessage =
        error?.response?.data?.message ||
        error?.message ||
        `${hideModal.nextStatus === "inactive" ? "Ẩn" : "Hiện"} gói đăng ký thất bại.`;
      setMessage(nextMessage);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const currentPage = total === 0 ? 0 : pagination?.page ?? 1;

  return (
    <section className="min-h-screen space-y-5 bg-slate-50/50 p-3 font-sans text-slate-800 antialiased lg:p-5">
      <div className="flex flex-col gap-4 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Quản lý gói đăng ký
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Gói đăng ký
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
          <SubscriptionManagementStatsSection stats={stats} />
          <Link
            to={routePaths.subscriptionNew}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={16} /> Thêm gói mới
          </Link>
        </div>
      </div>

      <div className="inline-flex rounded-2xl bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "plans"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Danh sách gói đăng ký
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("statistics")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "statistics"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Thống kê lượt đăng ký
        </button>
      </div>

      {activeTab === "statistics" ? <SubscriptionPlanStatisticsTab /> : null}

      {activeTab === "plans" ? (
        <>
          <form
            onSubmit={handleSearchSubmit}
            className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:grid-cols-[1.5fr_1fr_100px_100px]"
          >
            <label className="relative block">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm kiếm theo tên gói..."
                className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
              />
            </label>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="cursor-pointer rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Ẩn</option>
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Đặt lại
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Tìm kiếm
            </button>
          </form>

          {message ? (
            <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-600">
              {message}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="grid min-w-[1200px] grid-cols-[minmax(0,1.5fr)_120px_100px_140px_minmax(0,2fr)_180px_180px_140px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              <span>Tên gói</span>
              <span>Giá</span>
              <span>Thời hạn</span>
              <span>Trạng thái</span>
              <span>Tính năng</span>
              <span>Ngày tạo</span>
              <span>Cập nhật</span>
              <span className="pr-4 text-right">Hành động</span>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1200px] divide-y divide-slate-100">
                {isLoading ? (
                  <div className="p-12 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                    Đang tải danh sách gói đăng ký...
                  </div>
                ) : null}

                {!isLoading && plans.length === 0 ? (
                  <div className="p-12 text-center italic text-slate-400">
                    Không tìm thấy gói đăng ký nào phù hợp.
                  </div>
                ) : null}

                {!isLoading
                  ? plans.map((plan) => {
                      const statusConfig = getStatusConfig(plan.status);

                      return (
                        <div
                          key={plan._id}
                          className="group grid items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                          style={{
                            gridTemplateColumns:
                              "minmax(0,1.5fr) 120px 100px 140px minmax(0,2fr) 180px 180px 140px",
                          }}
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                            {plan.description ? (
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {plan.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="text-sm font-semibold text-slate-900">
                            {formatCurrency(plan.price)}
                          </div>

                          <div className="text-sm text-slate-600">{plan.durationDays} ngày</div>

                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}
                              ></span>
                              {statusConfig.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {plan.features?.slice(0, 4).map((feature) => (
                              <span
                                key={feature}
                                className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600"
                              >
                                {PLAN_FEATURES[feature] || feature}
                              </span>
                            ))}
                            {plan.features?.length > 4 ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                +{plan.features.length - 4} khác
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs text-slate-400">{formatDate(plan.createdAt)}</div>
                          <div className="text-xs text-slate-400">{formatDate(plan.updatedAt)}</div>

                          <div className="flex items-center justify-end gap-1.5 pr-2">
                            <Link
                              to={routePaths.subscriptionDetail(plan._id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              <Eye size={12} /> Xem
                            </Link>
                            <Link
                              to={routePaths.subscriptionEdit(plan._id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              <Edit2 size={12} /> Sửa
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                openHideModal(
                                  plan._id,
                                  plan.name,
                                  plan.status === "inactive" ? "active" : "inactive",
                                )
                              }
                              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                                plan.status === "inactive"
                                  ? "border border-emerald-100 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100"
                                  : "border border-amber-100 bg-amber-50/70 text-amber-700 hover:bg-amber-100"
                              }`}
                            >
                              {plan.status === "inactive" ? <Eye size={12} /> : <EyeOff size={12} />}
                              {plan.status === "inactive" ? "Hiện" : "Ẩn"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  : null}
              </div>
            </div>
          </div>

          {pagination ? (
            <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-medium text-slate-500">
                Trang {currentPage} / {totalPages}
                <span className="mx-2 text-slate-300">|</span>
                Tổng cộng: {total} bản ghi
              </p>

              {totalPages > 1 ? (
                <ReactPaginate
                  previousLabel="<"
                  nextLabel=">"
                  pageCount={totalPages}
                  onPageChange={handlePageChange}
                  forcePage={pagination.page - 1}
                  containerClassName="flex items-center gap-1"
                  pageClassName="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition hover:bg-slate-100"
                  previousClassName="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition hover:bg-slate-100"
                  nextClassName="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition hover:bg-slate-100"
                  activeClassName="bg-blue-600 text-white hover:bg-blue-700"
                  disabledClassName="cursor-not-allowed opacity-40"
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {hideModal.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {hideModal.nextStatus === "inactive" ? "Ẩn gói đăng ký?" : "Hiện gói đăng ký?"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {hideModal.nextStatus === "inactive"
                  ? "Gói sẽ được chuyển sang trạng thái ẩn và không còn hiển thị như gói đang hoạt động."
                  : "Gói sẽ được chuyển sang trạng thái hoạt động để tiếp tục hiển thị cho người dùng."}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Xác nhận {hideModal.nextStatus === "inactive" ? "ẩn" : "hiện"} gói{" "}
              <span className="font-bold text-slate-950">"{hideModal.planName}"</span>?
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeHideModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmHide}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
              >
                {isUpdatingStatus
                  ? hideModal.nextStatus === "inactive"
                    ? "Đang ẩn..."
                    : "Đang hiện..."
                  : hideModal.nextStatus === "inactive"
                    ? "Xác nhận ẩn"
                    : "Xác nhận hiện"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default SubscriptionPlansPage;
