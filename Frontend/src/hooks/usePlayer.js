import { useContext } from "react";
import PlayerContext from "../contexts/player-context";

export const usePlayer = () => {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider.");
  }

  return context;
};
