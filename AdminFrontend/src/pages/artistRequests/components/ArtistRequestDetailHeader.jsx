import { CalendarDays, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../../routes/routePaths";
import {
  formatDateTime,
  getStatusClasses,
  getStatusLabel,
} from "../utils";
import { SummaryItem } from "./ArtistRequestPrimitives";

const ArtistRequestDetailHeader = ({ artistRequest }) => {
  return (
    <div className="overflow-hidden bg-gradient-to-br from-sky-100 via-white to-amber-50">
      <div className="grid gap-8 px-6 py-7 xl:grid-cols-[minmax(0,1fr)_340px] xl:px-8">
        <div className="min-w-0">
          <Link
            to={routePaths.artistRequests}
            className="text-sm font-semibold text-sky-700 transition hover:text-sky-800"
          >
            Quay lại danh sách
          </Link>

          <div className="mt-5 flex min-w-0 items-center gap-4">
            {artistRequest?.avatar ? (
              <img
                src={artistRequest.avatar}
                alt={artistRequest.stageName}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
                AR
              </div>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-4xl font-semibold tracking-tight text-slate-950">
                {artistRequest?.stageName || "Hồ sơ đăng ký artist"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {artistRequest?.userId?.profile?.fullName || "-"} |{" "}
                {artistRequest?.userId?.email || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[1.5rem] bg-white/80 px-4 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Trạng thái
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                      artistRequest?.status
                    )}`}
                  >
                    {getStatusLabel(artistRequest?.status)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Ngày nộp
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatDateTime(artistRequest?.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryItem
              icon={UserRound}
              label="Người nộp"
              value={artistRequest?.userId?.profile?.fullName}
            />
            <SummaryItem
              icon={CalendarDays}
              label="Ngày duyệt"
              value={formatDateTime(artistRequest?.reviewedAt)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistRequestDetailHeader;
