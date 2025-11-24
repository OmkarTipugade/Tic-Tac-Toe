import type { PlayerSymbol } from "../types/types";
import defaultAvatar from "../assets/default-avatar.png";
const PlayerCard = ({
  avatarUrl,
  player,
  symbol,
  isCurrentTurn,
  isYou,
  score = 0,
}: {
  avatarUrl: string;
  player: { userId: string; username: string } | null;
  symbol: PlayerSymbol;
  isCurrentTurn: boolean;
  isYou: boolean;
  score?: number;
}) => (
  <div
    className={`
        p-6 rounded-xl border-4 transition-all duration-300
        ${
          isCurrentTurn
            ? "border-green-500 bg-green-50 shadow-lg scale-105"
            : "border-gray-300 bg-white"
        }
        ${!player ? "opacity-50" : ""}
      `}
  >
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <div
          className={`
              w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold
              ${
                symbol === "X"
                  ? "bg-blue-500 text-white"
                  : "bg-red-500 text-white"
              }
            `}
        >
          {symbol}
        </div>
        <div>
          {avatarUrl && (
            <img src={avatarUrl || defaultAvatar} alt="user avatar" />
          )}
          <p className="font-bold text-lg">
            {player?.username || "Waiting..."}
            {isYou && <span className="text-sm text-gray-500 ml-2">(You)</span>}
          </p>
          <p className="text-sm font-semibold text-gray-700">Score: {score}</p>
          {isCurrentTurn && player && (
            <p className="text-sm text-green-600 font-semibold">Your turn!</p>
          )}
        </div>
      </div>
      {isCurrentTurn && player && (
        <div className="animate-pulse">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      )}
    </div>
    {!player && (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
        <span>Waiting for player...</span>
      </div>
    )}
  </div>
);

export default PlayerCard;
