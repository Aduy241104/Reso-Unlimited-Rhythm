import { Clock3 } from "lucide-react";

const trackGridClassNameByType = {
  default:
    "grid-cols-[2.5rem_minmax(0,1fr)_4rem_3.25rem_2.75rem]",

  rank:
    "grid-cols-[2.5rem_3rem_minmax(0,1fr)_8.75rem_3.25rem_2rem]",
};

const headerColumnsByType = {
  default: [
    { label: "#", className: "justify-center" },
    { label: "Tiêu đề", className: "justify-start" },
    { label: "Đã lưu", className: "justify-center text-center" },
    {
      icon: Clock3,
      className: "justify-end pr-1",
      iconClassName: "h-3.5 w-3.5",
    },
    { label: "", className: "justify-end" },
  ],

  rank: [
    { label: "#", className: "justify-center" },
    { label: "", className: "justify-center" },
    { label: "Tiêu đề", className: "justify-start" },
    { label: "Thống kê", className: "justify-end text-right" },
    {
      icon: Clock3,
      className: "justify-end pr-1",
      iconClassName: "h-3.5 w-3.5",
    },
    { label: "", className: "justify-end" },
  ],
};

const TrackListSection = ({
  type = "default",
  isLoading = false,
  errorMessage = "",
  loadingMessage = "Đang tải bài hát...",
  mobileLabel = "Danh sách bài hát",
  headerColumns,
  emptyMessage = "Chưa có bài hát nào.",
  hasItems = false,
  loadingClassName = "",
  containerClassName = "",
  mobileLabelClassName = "",
  itemsClassName = "",
  emptyMessageClassName = "",
  children,
}) => {
  const gridClassName =
    trackGridClassNameByType[type] || trackGridClassNameByType.default;

  const resolvedHeaderColumns =
    headerColumns || headerColumnsByType[type] || headerColumnsByType.default;

  const headerGridClassName = [
    "mb-1 hidden",
    gridClassName,
    "items-center gap-3",
    "border-b border-white/10",
    "px-3 pb-2",
    "text-[10px] font-semibold uppercase tracking-[0.14em]",
    "text-white/50",
    "md:grid",
  ]
    .join(" ")
    .trim();

  if (isLoading) {
    return (
      <div
        className={ [
          "rounded-[20px] border border-black/5 bg-black/[0.02] px-4 py-6 text-sm text-[#52525b]",
          "dark:border-white/10 dark:bg-white/[0.03] dark:text-[#a1a1aa]",
          loadingClassName,
        ]
          .join(" ")
          .trim() }
      >
        { loadingMessage }
      </div>
    );
  }

  if (errorMessage) return null;

  return (
    <div
      className={ [
        "rounded-[18px] border border-black/5 sm:rounded-[3px] sm:border-0 sm:bg-transparent sm:p-4",
        containerClassName,
      ]
        .join(" ")
        .trim() }
    >
      <div className="mb-3 px-0 sm:hidden">
        <p
          className={ [
            "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#71717a] dark:text-[#a1a1aa]",
            mobileLabelClassName,
          ]
            .join(" ")
            .trim() }
        >
          { mobileLabel }
        </p>
      </div>

      <div className={ headerGridClassName }>
        { resolvedHeaderColumns.map((column, index) => {
          const Icon = column?.icon;

          return (
            <span
              key={ `${column?.label || "column"}-${index}` }
              className={ [
                "flex min-h-4 items-center whitespace-nowrap",
                column?.className || "",
              ]
                .join(" ")
                .trim() }
            >
              { Icon ? (
                <Icon
                  className={ [
                    "text-white/45",
                    column?.iconClassName || "h-3.5 w-3.5",
                  ]
                    .join(" ")
                    .trim() }
                />
              ) : (
                column?.label || ""
              ) }
            </span>
          );
        }) }
      </div>

      <div className={ ["space-y-0", itemsClassName].join(" ").trim() }>
        { hasItems ? (
          children
        ) : (
          <div
            className={ [
              "px-3 py-4 text-sm text-[#52525b] dark:text-[#a1a1aa]",
              emptyMessageClassName,
            ]
              .join(" ")
              .trim() }
          >
            { emptyMessage }
          </div>
        ) }
      </div>
    </div>
  );
};

export { trackGridClassNameByType, headerColumnsByType };
export default TrackListSection;