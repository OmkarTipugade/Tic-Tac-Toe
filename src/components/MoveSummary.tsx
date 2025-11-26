import React from "react";
import type { Moves } from "../types/types";

interface MoveSummaryProps {
  moves: Moves[];
  gameMode: "classic" | "timed";
}

const MoveSummary: React.FC<MoveSummaryProps> = ({ moves, gameMode }) => {

  return (
    <div className="w-full max-w-md mx-auto mt-4 bg-white border border-black p-4 rounded-lg shadow-[4px_4px_0px_0px_black]">
      <h2 className="text-lg font-semibold text-center mb-3 text-black">
        Move Summary
      </h2>

      <p className="text-xs text-gray-700 text-center mb-2">
        Mode: <span className="font-semibold capitalize">{gameMode}</span>
      </p>

      {moves.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-2 text-black">Move History</h3>
          <div className="max-h-40 overflow-y-auto text-xs border border-black rounded bg-white">
            {/* Column Headings */}
            <div className="flex justify-between py-2 px-2 border-b-2 border-black bg-gray-100 font-bold text-black sticky top-0">
              <span className="w-16">Move #</span>
              <span className="w-16">Player</span>
              <span className="w-20">Position</span>
              <span className="w-24">Time Taken</span>
            </div>

            {/* Move Rows */}
            {moves.map((m, index) => (
              <div
                key={index}
                className="flex justify-between py-1 px-2 border-b border-gray-300 last:border-b-0 text-black hover:bg-gray-50"
              >
                <span className="w-16">#{m.moveNo}</span>
                <span className="w-16">{m.player}</span>
                <span className="w-20">
                  {m.row !== null && m.col !== null
                    ? `(${m.row + 1}, ${m.col + 1})`
                    : "Timeout"}
                </span>
                <span className="w-24">{m.timeTaken.toFixed(2)}s</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MoveSummary;
