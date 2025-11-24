import React from "react";
import type { Moves } from "../types/types";

interface MoveSummaryProps {
  moves: Moves[];
  gameMode: "classic" | "timed";
}

const MoveSummary: React.FC<MoveSummaryProps> = ({ moves, gameMode }) => {
  const lastMove = moves[moves.length - 1];

  return (
    <div className="w-full max-w-md mx-auto mt-4 bg-white border border-black p-4 rounded-lg shadow-[4px_4px_0px_0px_black]">
      <h2 className="text-lg font-semibold text-center mb-3 text-black">
        Move Summary
      </h2>

      <p className="text-xs text-gray-700 text-center mb-2">
        Mode: <span className="font-semibold capitalize">{gameMode}</span>
      </p>

      {lastMove ? (
        <div className="mb-4 text-sm text-black">
          <p>
            <span className="font-semibold">Last Move #</span> {lastMove.moveNo}{" "}
            by <strong>{lastMove.player}</strong>
          </p>
          <p>
            Position:{" "}
            {lastMove.row !== null && lastMove.col !== null
              ? `(${lastMove.row + 1}, ${lastMove.col + 1})`
              : "Timeout / No move"}
          </p>
          <p>Time taken: {lastMove.timeTaken.toFixed(2)}s</p>
          <p>
            Result: <span className="capitalize">{lastMove.result}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-700 text-center mb-4">
          No moves yet. Start playing!
        </p>
      )}

      {moves.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-2 text-black">History</h3>
          <div className="max-h-40 overflow-y-auto text-xs border border-black rounded p-2 bg-white">
            {moves.map((m) => (
              <div
                key={m.moveNo}
                className="flex justify-between py-1 border-b border-black last:border-b-0 text-black"
              >
                <span># {m.moveNo}</span>
                <span>Player {m.player}</span>
                <span>
                  {m.row !== null && m.col !== null
                    ? `(${m.row + 1}, ${m.col + 1})`
                    : "Timeout"}
                </span>
                <span>{m.timeTaken.toFixed(2)}s</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MoveSummary;
