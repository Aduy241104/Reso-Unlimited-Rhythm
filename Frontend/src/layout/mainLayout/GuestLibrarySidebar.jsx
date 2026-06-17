import { routePaths } from "../../routes/routePaths";

const GUEST_LIBRARY_CARDS = [
  {
    title: "Tạo danh sách phát đầu tiên của bạn",
    description: "Rất dễ! Chúng tôi sẽ giúp bạn",
    actionLabel: "Tạo danh sách phát",
    actionPath: routePaths.login,
  },
];

const GUEST_LIBRARY_FOOTER_LINKS = [
  "Pháp lý",
  "Trung tâm an toàn và quyền riêng tư",
  "Chính sách quyền riêng tư",
  "Cookie",
  "Giới thiệu Quảng cáo",
  "Hỗ trợ tiếp cận",
];

const GuestLibrarySidebar = ({ onAction }) => (
  <div className="flex h-full flex-col px-1">
    <div className="space-y-3">
      {GUEST_LIBRARY_CARDS.map((card) => (
        <section
          key={card.title}
          className="rounded-2xl bg-white/8 px-4 py-4 text-white"
        >
          <h3 className="text-base font-bold leading-snug">
            {card.title}
          </h3>
          <p className="mt-1.5 text-xs text-[#d2cbc4]">{card.description}</p>
          <button
            type="button"
            onClick={() => onAction?.(card.actionPath)}
            className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#111111] transition hover:bg-white/90"
          >
            {card.actionLabel}
          </button>
        </section>
      ))}
    </div>

    <div className="mt-auto px-4 pb-6 pt-8 text-xs text-[#d2cbc4]">
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        {GUEST_LIBRARY_FOOTER_LINKS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onAction?.(routePaths.home)}
        className="mt-5 text-xs font-semibold text-white transition hover:text-[#f5b66f]"
      >
        Cookie
      </button>
    </div>
  </div>
);

export default GuestLibrarySidebar;
