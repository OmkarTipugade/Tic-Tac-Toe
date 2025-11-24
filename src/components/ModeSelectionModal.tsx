import React, { useState } from "react";

interface ModeSelectionModalProps {
  onSelect: (mode: "classic" | "timed", time?: number) => void;
}

const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({ onSelect }) => {
  const [mode, setMode] = useState<"classic" | "timed">("classic");
  const [timePerMove, setTimePerMove] = useState<number>(5);

  const timeOptions = [5, 10, 15, 20, 30];

  const handleSubmit = () => {
    if (mode === "timed" && (!timePerMove || timePerMove <= 0)) return;
    onSelect(mode, mode === "timed" ? timePerMove : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border border-black rounded-xl shadow-[4px_4px_0px_0px_black] p-6 w-80 sm:w-96">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center text-black">
          Choose Game Mode
        </h2>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setMode("classic")}
            className={`border rounded-lg px-4 py-2 text-left text-sm sm:text-base ${
              mode === "classic"
                ? "border-black bg-gray-100"
                : "border-gray-300"
            }`}
          >
            <span className="font-semibold text-black block">Classic</span>
            <span className="text-xs text-gray-600">
              No timer, just pure tic-tac-toe.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("timed")}
            className={`border rounded-lg px-4 py-2 text-left text-sm sm:text-base ${
              mode === "timed"
                ? "border-black bg-gray-100"
                : "border-gray-300"
            }`}
          >
            <span className="font-semibold text-black block">Timed</span>
            <span className="text-xs text-gray-600">
              Each player has limited time per move.
            </span>
          </button>
        </div>

        {mode === "timed" && (
          <div className="mt-4">
            <label className="block text-xs sm:text-sm text-gray-700 mb-2">
              Seconds per move
            </label>

            <div className="grid grid-cols-3 gap-2">
              {timeOptions.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTimePerMove(sec)}
                  className={`border rounded-md py-1 text-sm ${
                    timePerMove === sec
                      ? "border-black bg-black text-white"
                      : "border-gray-400 text-black"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          className="mt-5 w-full bg-black text-white rounded-lg py-2 text-sm sm:text-base font-semibold hover:bg-gray-900"
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default ModeSelectionModal;
