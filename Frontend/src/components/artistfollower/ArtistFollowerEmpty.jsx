import { Users } from "lucide-react";

const ArtistFollowerEmpty = () => {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#ddd7ff] bg-[#fcfbff] px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1edff] text-[#6f5cf1] dark:bg-white/[0.06] dark:text-[#d4cdff]">
        <Users className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[#2f2747] dark:text-white">
        Chưa có người theo dõi nào
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#7b7494] dark:text-[#a1a1aa]">
        Danh sách follower sẽ xuất hiện tại đây ngay khi có người dùng bắt đầu theo dõi nghệ sĩ của bạn.
      </p>
    </div>
  );
};

export default ArtistFollowerEmpty;
