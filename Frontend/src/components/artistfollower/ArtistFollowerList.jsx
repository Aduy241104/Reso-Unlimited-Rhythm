import ArtistFollowerItem from "./ArtistFollowerItem";

const ArtistFollowerList = ({ followers = [] }) => {
  return (
    <div className="space-y-3">
      {followers.map((follower, index) => (
        <ArtistFollowerItem
          key={follower?.userId || `${follower?.fullName || "follower"}-${follower?.followedAt || index}`}
          follower={follower}
        />
      ))}
    </div>
  );
};

export default ArtistFollowerList;