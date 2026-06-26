import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { Search, Plus, Trash2, Edit2, ArrowUpRight } from "lucide-react";
import adminGenreService from "../../services/adminGenreService";
import { routePaths } from "../../routes/routePaths";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[100px] text-center sm:text-left">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
  </div>
);

const GenresListPage = () => {
  const [genres, setGenres] = useState([]);
  
  // State lưu trữ giá trị nhập tạm thời trên ô input ô tìm kiếm để chống spam API
  const [searchTerm, setSearchTerm] = useState("");
  
  // State Query chuẩn chỉ kích hoạt gọi dữ liệu và phân trang
  const [query, setQuery] = useState({ search: "", page: 1, limit: 10 });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false); 

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, genreId: null, genreName: "" });

  const loadGenres = async (params = query) => {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await adminGenreService.getAdminGenresService({ search: params.search });
      const list = response?.genres ?? [];
      const dataList = Array.isArray(list) ? list : [];
      setGenres(dataList);
      
      const totalItems = dataList.length;
      const totalPages = Math.ceil(totalItems / params.limit) || 0;

      setPagination({
        page: params.page,
        limit: params.limit,
        total: totalItems,
        totalPages: totalPages
      });
    } catch (error) {
      setMessage("Không thể đồng bộ cơ sở dữ liệu phân mục thể loại nhạc.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadGenres(query); }, [query]);

  const handleSearchSubmit = (e) => { 
    e.preventDefault(); 
    setQuery(prev => ({ ...prev, search: searchTerm.trim(), page: 1 }));
  };
  
  const handleResetFilters = () => {
    setSearchTerm("");
    setQuery({ search: "", page: 1, limit: 10 });
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
  };

  const openDeleteModal = (id, name) => { setDeleteModal({ isOpen: true, genreId: id, genreName: name }); };
  const closeDeleteModal = () => { setDeleteModal({ isOpen: false, genreId: null, genreName: "" }); };

  const handleConfirmDelete = async () => {
    const { genreId } = deleteModal;
    if (!genreId) return;
    setIsDeleting(true);
    try {
      await adminGenreService.deleteAdminGenreService(genreId);
      await loadGenres(query); 
      closeDeleteModal();
    } catch (error) {
      setMessage("Xóa phân mục thể loại thất bại.");
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  // SỬA LỖI LOGIC TẠI ĐÂY: Triệt tiêu hoàn toàn lỗi hiển thị dạng 1/0 khi trống danh sách
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const currentPage = total === 0 ? 0 : (pagination?.page ?? 1);
  const pageLabel = `${currentPage}/${totalPages}`;
  
  // Lấy danh sách cắt mảng thực tế của trang hiện tại
  const paginatedGenres = genres.slice((query.page - 1) * query.limit, query.page * query.limit);

  return (
    <section className="space-y-6 max-w-[1400px] mx-auto p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
      
      {/* Khung 1: Header Dashboard đồng bộ cấu trúc hình mẫu */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Danh mục hệ thống</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Danh sách thể loại</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
          <div className="grid gap-2 grid-cols-3">
            <HeaderStat label="Tổng hồ sơ" value={total} />
            <HeaderStat label="Hiển thị" value={paginatedGenres.length} />
            <HeaderStat label="Trang" value={pageLabel} />
          </div>
          <Link to={routePaths.genreNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap">
            <Plus size={16} /> Thêm thể loại mới
          </Link>
        </div>
      </div>

      {/* Khung 2: Thanh điều khiển chứa ô Tìm kiếm & Đặt lại */}
      <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-[1fr_100px_100px]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm kiếm theo tên nhãn hoặc mô tả thể loại nhạc..." className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50" />
        </label>
        
        <button
          type="button"
          onClick={handleResetFilters}
          className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3"
        >
          Đặt lại
        </button>

        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm">Tìm kiếm</button>
      </form>

      {message && <div className="border border-red-100 bg-red-50/50 px-4 py-3 text-sm rounded-xl text-red-600">{message}</div>}

      {/* Khung 3: Danh sách cấu trúc hàng Spaced Rows (Đã đồng bộ) */}
      {genres.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-base font-semibold text-slate-900">Chưa có phân mục thể loại nhạc nào được thiết lập.</p>
          <p className="mt-1 text-sm text-slate-400">Hồ sơ trống hoặc không có dữ liệu nào khớp từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="grid min-w-[960px] grid-cols-[80px_minmax(0,1.5fr)_minmax(0,2fr)_140px_160px_140px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            <span>Artwork</span>
            <span>Tên nhãn</span>
            <span>Mô tả tổng quan</span>
            <span>Trạng thái</span>
            <span>Ngày tạo</span>
            <span className="text-right pr-4">Hành động</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[960px] divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-12 text-center text-sm font-medium text-slate-400 uppercase tracking-wider">Đang đồng bộ ma trận dữ liệu...</div>
              ) : (
                paginatedGenres.map((g) => (
                  <article key={g._id} className="relative grid grid-cols-[80px_minmax(0,1.5fr)_minmax(0,2fr)_140px_160px_140px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center">
                    <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${g.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                    
                    <div className="pl-2">
                      {g.image ? (
                        <img src={g.image} alt={g.name} className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 uppercase">GENRE</div>
                      )}
                    </div>

                    <span className="text-sm font-bold text-slate-900">{g.name}</span>
                    <p className="truncate text-xs text-slate-500 font-medium">{g.description || "—"}</p>
                    
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${g.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${g.isActive ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                        {g.isActive ? "Công khai" : "Tạm khóa"}
                      </span>
                    </div>

                    <span className="text-xs font-mono font-medium text-slate-400">{formatDate(g.createdAt)}</span>

                    <div className="flex items-center justify-end gap-1.5 pr-2">
                      <Link to={routePaths.genreEdit(g._id)} className="inline-flex items-center gap-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-sm">
                        <Edit2 size={12} /> Sửa
                      </Link>
                      <button type="button" onClick={() => openDeleteModal(g._id, g.name)} className="inline-flex items-center gap-1 border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-50 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-sm">
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Khung 4: Khối điều khiển Phân trang cố định chuẩn chỉ chân trang */}
      {pagination && (
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-sm text-slate-500 font-medium">
            Trang {currentPage} / {totalPages}
            <span className="mx-2 text-slate-300">|</span>
            Tổng cộng: {total} bản ghi
          </p>

          {totalPages > 1 && (
            <ReactPaginate 
              breakLabel="..." 
              nextLabel=">" 
              previousLabel="<" 
              forcePage={Math.max(pagination.page - 1, 0)} 
              onPageChange={handlePageChange} 
              pageRangeDisplayed={3} 
              marginPagesDisplayed={1} 
              pageCount={totalPages} 
              renderOnZeroPageCount={null} 
              containerClassName="flex flex-wrap items-center gap-2" 
              pageLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200" 
              previousLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200" 
              nextLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200" 
              breakLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-500" 
              activeLinkClassName="bg-blue-600 text-white hover:bg-blue-600" 
              disabledLinkClassName="cursor-not-allowed opacity-40 hover:bg-slate-100" 
            />
          )}
        </div>
      )}

      {/* Pop-up Modal Xóa Thể Loại */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white p-6 shadow-xl rounded-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Xóa thể loại nhạc?</h2>
              <p className="text-xs text-slate-400 mt-0.5">Mọi liên kết bài hát thuộc thể loại này có thể bị ảnh hưởng chỉ mục cấu trúc gộp.</p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">Xác nhận gỡ bỏ hoàn toàn phân mục danh mục <span className="font-bold text-slate-950">"{deleteModal.genreName}"</span>?</p>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={closeDeleteModal} className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition">Hủy bỏ</button>
              <button type="button" disabled={isDeleting} onClick={handleConfirmDelete} className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition disabled:opacity-50">Xác nhận gỡ bỏ</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GenresListPage;
