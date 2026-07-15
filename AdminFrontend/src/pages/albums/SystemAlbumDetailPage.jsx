import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import {
  getAdminAlbumDetailService,
  updateAdminAlbumStatusService,
} from "../../services/albumManagementService";
import AlbumManagementInfoSections from "./components/AlbumManagementInfoSections";
import AlbumManagementModerationSidebar from "./components/AlbumManagementModerationSidebar";

const initialBlockForm = {
  blockedReason: "",
  adminNote: "",
};

const SystemAlbumDetailPage = () => {
  const { id } = useParams();
  const [albumResponse, setAlbumResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("error");
  const [modalType, setModalType] = useState("");
  const [blockForm, setBlockForm] = useState(initialBlockForm);

  const album = albumResponse?.data?.album ?? null;

  useEffect(() => {
    if (!id) return;

    const loadAlbum = async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const result = await getAdminAlbumDetailService(id);
        setAlbumResponse(result);
      } catch (error) {
        setMessageTone("error");
        setMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải chi tiết album."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadAlbum();
  }, [id]);

  const closeModal = (force = false) => {
    if (isSubmitting && !force) return;
    setModalType("");
    setBlockForm(initialBlockForm);
  };

  const openBlockModal = () => {
    setBlockForm({
      blockedReason: album?.blockedReason || "",
      adminNote: "",
    });
    setModalType("block");
  };

  const openUnblockModal = () => {
    setModalType("unblock");
  };

  const submitStatusUpdate = async () => {
    if (!album?.id) return;

    const payload =
      modalType === "block"
        ? {
            action: "block",
            blockedReason: blockForm.blockedReason.trim(),
            adminNote: blockForm.adminNote.trim(),
          }
        : { action: "unblock" };

    if (modalType === "block" && !payload.blockedReason && !payload.adminNote) {
      setMessageTone("error");
      setMessage("Vui lòng nhập lý do chặn hoặc ghi chú nội bộ.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await updateAdminAlbumStatusService(album.id, payload);
      setAlbumResponse(result);
      setMessageTone("success");
      setMessage(result?.message || "Cập nhật trạng thái album thành công.");
      toast.success(result?.message || "Cập nhật trạng thái album thành công.");
      closeModal(true);
    } catch (error) {
      const nextMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể cập nhật trạng thái album.";
      setMessageTone("error");
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="-mt-3 space-y-6 pb-6">
      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            messageTone === "success"
              ? "border-slate-300 bg-slate-100 text-slate-900"
              : "border-slate-300 bg-white text-slate-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center text-sm text-slate-500">
          Đang tải chi tiết album.
        </div>
      ) : album ? (
        <AlbumManagementInfoSections
          album={album}
          moderationSection={
            <AlbumManagementModerationSidebar
              album={album}
              isSubmitting={isSubmitting}
              onBlock={openBlockModal}
              onUnblock={openUnblockModal}
            />
          }
        />
      ) : null}

      {modalType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {modalType === "block" ? "Chặn album" : "Gỡ chặn album"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-lg text-slate-400 transition hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">
                {album?.title || "-"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {album?.artist?.name || "-"} · {album?.artist?.email || "-"}
              </p>
            </div>

            {modalType === "block" ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Lý do chặn
                  </label>
                  <textarea
                    value={blockForm.blockedReason}
                    onChange={(event) =>
                      setBlockForm((prev) => ({
                        ...prev,
                        blockedReason: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Nhập lý do chặn."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Ghi chú nội bộ
                  </label>
                  <textarea
                    value={blockForm.adminNote}
                    onChange={(event) =>
                      setBlockForm((prev) => ({
                        ...prev,
                        adminNote: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Nhập ghi chú nội bộ nếu cần."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                Xác nhận gỡ chặn album này.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void submitStatusUpdate()}
                disabled={isSubmitting}
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  modalType === "block"
                    ? "bg-slate-950 text-white hover:bg-slate-800"
                    : "border border-slate-300 bg-slate-100 text-slate-950 hover:bg-slate-200"
                }`}
              >
                {isSubmitting
                  ? "Đang xử lý..."
                  : modalType === "block"
                    ? "Xác nhận chặn"
                    : "Xác nhận gỡ chặn"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default SystemAlbumDetailPage;
