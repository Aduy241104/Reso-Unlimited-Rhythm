import { ChevronLeft, ChevronRight } from "lucide-react";

const ArtistFollowerPagination = ({
  page = 1,
  totalPages = 0,
  totalItems = 0,
  limit = 10,
  onPreviousPage,
  onNextPage,
}) => {
  const safeTotalPages = Math.max(Number(totalPages || 0), 0);
  const safePage = Math.max(Number(page || 1), 1);
  const isPreviousDisabled = safePage <= 1 || safeTotalPages <= 1;
  const isNextDisabled = safePage >= safeTotalPages || safeTotalPages <= 1;
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * limit + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(safePage * limit, totalItems);

  if (safeTotalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-[#ece8ff] bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-[#181818] sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <p className="text-sm font-medium text-[#2f2747] dark:text-white">
          Trang {safePage} / {safeTotalPages}
        </p>
        <p className="mt-1 text-sm text-[#7b7494] dark:text-[#a1a1aa]">
          Hiển thị {startItem}-{endItem} trên tổng {totalItems} người theo dõi.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={isPreviousDisabled}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#e4def8] bg-white px-4 text-sm font-medium text-[#5f5878] transition hover:border-[#cfc6f4] hover:text-[#2f2747] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#d4d4d8] dark:hover:bg-white/[0.06]"
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </button>

        <button
          type="button"
          onClick={onNextPage}
          disabled={isNextDisabled}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#6f5cf1] px-4 text-sm font-semibold text-white transition hover:bg-[#5f4fe0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sau
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ArtistFollowerPagination;
