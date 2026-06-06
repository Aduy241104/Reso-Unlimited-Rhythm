import { Plus } from "lucide-react";

const CreatePlaylistButton = ({ onClick, isCompact = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-full bg-[#2a2a2a] text-white transition-all hover:bg-[#3a3a3a]",
        isCompact ? "h-10 w-10 justify-center" : "gap-2 px-4 py-2",
      ].join(" ")}
      aria-label="Tao playlist"
      title="Tao playlist"
    >
      <Plus className="h-4 w-4" />
      {!isCompact ? <span>Tạo</span> : null}
    </button>
  );
};

export default CreatePlaylistButton;
