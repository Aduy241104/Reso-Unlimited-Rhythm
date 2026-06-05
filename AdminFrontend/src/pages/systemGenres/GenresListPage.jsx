import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import adminGenreService from "../../services/adminGenreService";
import { routePaths } from "../../routes/routePaths";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const GenresListPage = () => {
  const [genres, setGenres] = useState([]);
  const [filters, setFilters] = useState({ search: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false); 

  // --- STATE CHO MODAL XÁC NHẬN XÓA ---
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    genreId: null,
    genreName: "",
  });

  const loadGenres = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const { genres: list } = await adminGenreService.getAdminGenresService(filters);
      setGenres(Array.isArray(list) ? list : []);
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || "Không thể tải danh sách thể loại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGenres();
  }, [filters]);

  const handleChange = (field) => (e) => {
    setFilters((p) => ({ ...p, [field]: e.target.value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadGenres();
  };

  // --- MỞ MODAL XÁC NHẬN ---
  const openDeleteModal = (id, name) => {
    setDeleteModal({
      isOpen: true,
      genreId: id,
      genreName: name,
    });
  };

  // --- ĐÓNG MODAL ---
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, genreId: null, genreName: "" });
  };

  // --- XỬ LÝ XÓA KHI USER BẤM "XÁC NHẬN" TRÊN MODAL ---
  const handleConfirmDelete = async () => {
    const { genreId } = deleteModal;
    if (!genreId) return;

    setIsDeleting(true);
    setMessage("");

    try {
      await adminGenreService.deleteAdminGenreService(genreId);
      await loadGenres(); 
      // Có thể đổi thông báo alert thành thông báo state nếu muốn
      alert("Xóa thể loại thành công!"); 
      closeDeleteModal();
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || "Xóa thể loại thất bại.");
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-6 relative">
      <div className="flex flex-col gap-3 rounded border border-black bg-white p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">Genre Management</p>
          <h1 className="mt-3 text-4xl font-semibold text-black">Genre List</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">Browse and manage music genres with cover images and status.</p>
        </div>
        <div className="flex-shrink-0">
          <Link to={routePaths.genreNew} className="inline-flex items-center justify-center rounded bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/90">
            Create Genre
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="grid gap-4 rounded border border-black bg-white p-6 md:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-black/70">Search</label>
          <input value={filters.search} onChange={handleChange("search")} placeholder="Name or description" className="w-full rounded border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black" />
        </div>

        <div className="flex items-end">
          <button type="submit" className="w-full rounded bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/90">Search</button>
        </div>
      </form>

      {message && <div className="rounded border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{message}</div>}

      <div className="overflow-hidden rounded border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-black">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-700">
              <tr>
                <th className="border-b border-black/10 px-6 py-4">Image</th>
                <th className="border-b border-black/10 px-6 py-4">Name</th>
                <th className="border-b border-black/10 px-6 py-4">Description</th>
                <th className="border-b border-black/10 px-6 py-4">Active</th>
                <th className="border-b border-black/10 px-6 py-4">Created At</th>
                <th className="border-b border-black/10 px-6 py-4 text-right">Actions</th> 
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-500">Loading genres...</td>
                </tr>
              ) : genres.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-500">No genres found.</td>
                </tr>
              ) : (
                genres.map((g) => (
                  <tr key={g._id} className="even:bg-slate-50">
                    <td className="border-b border-black/10 px-6 py-4">
                      {g.image ? (
                        <img src={g.image} alt={g.name} className="h-14 w-14 rounded object-cover border border-black/10" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded border border-black/10 bg-slate-100 text-xs text-black/40">No image</div>
                      )}
                    </td>
                    <td className="border-b border-black/10 px-6 py-4 font-semibold text-black">{g.name}</td>
                    <td className="border-b border-black/10 px-6 py-4">{g.description || "-"}</td>
                    <td className="border-b border-black/10 px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${g.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {g.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="border-b border-black/10 px-6 py-4">{formatDate(g.createdAt)}</td>
                    
                    <td className="border-b border-black/10 px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <Link
                        to={routePaths.genreEdit(g._id)}
                        className="inline-flex rounded bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/90"
                      >
                        Edit
                      </Link>
                      
                      {/* Bấm nút này sẽ mở modal thay vì gọi confirm của trình duyệt */}
                      <button
                        type="button"
                        onClick={() => openDeleteModal(g._id, g.name)}
                        className="inline-flex rounded bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- GIAO DIỆN MODAL XÁC NHẬN ĐẸP (POPUP) --- */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Lớp nền mờ bên sau (Backdrop) */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={closeDeleteModal} // Bấm ra ngoài modal để đóng
          ></div>

          {/* Hộp thoại Modal */}
          <div className="relative w-full max-w-md transform overflow-hidden rounded bg-white p-8 text-left align-middle shadow-2xl border border-black transition-all space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center justify-center rounded-full bg-rose-100 p-3 text-rose-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </span>
              <h3 className="text-xl font-semibold leading-6 text-black">Xóa thể loại này?</h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Bạn có chắc chắn muốn xóa thể loại <strong className="text-black font-semibold">"{deleteModal.genreName}"</strong>? 
                Hành động này không thể hoàn tác và dữ liệu liên quan có thể bị ảnh hưởng.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex justify-center rounded border border-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex justify-center rounded bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GenresListPage;