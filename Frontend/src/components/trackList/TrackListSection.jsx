const defaultHeaderGridClassName = `
   mb-2 hidden grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_3.25rem_2.75rem] items-center gap-3
  border-b border-black/6 px-3 pb-3 text-xs font-medium uppercase tracking-[0.24em]
  text-[#71717a] dark:border-white/10 dark:text-[#a1a1aa] md:grid
`;

const defaultHeaderColumns = [
  { label: "#" },
  { label: "Tiêu đề" },
  { label: "Đã lưu", className: "text-center" },
  { label: "Thời lượng", className: "text-right" },
];

const TrackListSection = ({
  isLoading = false,
  errorMessage = "",
  loadingMessage = "Đang tải bài hát...",
  mobileLabel = "Danh sách bài hát",
  headerColumns = defaultHeaderColumns,
  headerGridClassName = defaultHeaderGridClassName,
  emptyMessage = "Chưa có bài hát nào.",
  hasItems = false,
  loadingClassName = "",
  containerClassName = "",
  mobileLabelClassName = "",
  itemsClassName = "",
  emptyMessageClassName = "",
  children,
}) => {
  if (isLoading) {
    return (
      <div
        className={ [
          "rounded-[20px] border border-black/5 bg-black/[0.02] px-4 py-6 text-sm text-[#52525b] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#a1a1aa]",
          loadingClassName,
        ].join(" ").trim() }
      >
        { loadingMessage }
      </div>
    );
  }

  if (errorMessage) {
    return null;
  }

  return (
    <div
      className={ [
        "rounded-[18px] border border-black/5 sm:rounded-[3px] sm:border-0 sm:bg-transparent sm:p-4",
        containerClassName,
      ].join(" ").trim() }
    >
      <div className="mb-3 px-0 sm:hidden">
        <p
          className={ [
            "text-[11px] font-semibold uppercase tracking-[0.24em] text-[#71717a] dark:text-[#a1a1aa]",
            mobileLabelClassName,
          ].join(" ").trim() }
        >
          { mobileLabel }
        </p>
      </div>

      { headerColumns.length > 0 ? (
        <div className={ headerGridClassName }>
          { headerColumns.map((column, index) => (
            <span
              key={ `${column?.label || "column"}-${index}` }
              className={ column?.className || "" }
            >
              { column?.label || "" }
            </span>
          )) }
        </div>
      ) : null }

      <div className={ ["space-y-0", itemsClassName].join(" ").trim() }>
        { hasItems ? (
          children
        ) : (
          <div
            className={ [
              "px-3 py-4 text-sm text-[#52525b] dark:text-[#a1a1aa]",
              emptyMessageClassName,
            ].join(" ").trim() }
          >
            { emptyMessage }
          </div>
        ) }
      </div>
    </div>
  );
};

export default TrackListSection;
