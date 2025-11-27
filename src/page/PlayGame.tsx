import React, { useEffect, useMemo, useState } from "react";
import PlayerCard from "../components/PlayerCard";
import ModeSelectionModal from "../components/ModeSelectionModal";
import type { PlayerSymbol } from "../types/types";

type GameMode = "classic" | "timed";

type CellValue = PlayerSymbol | null;
type Board = CellValue[][];

const createEmptyBoard = (): Board =>
  Array(3)
    .fill(null)
    .map(() => Array<CellValue>(3).fill(null));

const PlayGame: React.FC = () => {
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [moveTime, setMoveTime] = useState<number | undefined>(undefined);
  const [playerNames, setPlayerNames] = useState({ X: "", O: "" });

  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<PlayerSymbol>("X");
  const [winner, setWinner] = useState<PlayerSymbol | "draw" | null>(null);
  const [winningCells, setWinningCells] = useState<
    { row: number; col: number }[]
  >([]);

  const [scores, setScores] = useState<{ X: number; O: number }>({
    X: 0,
    O: 0,
  });

  const [currentMoveStartTime, setCurrentMoveStartTime] = useState<
    number | null
  >(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const isBoardFull = (b: Board) =>
    b.every((row) => row.every((cell) => cell !== null));

  const checkWinner = (b: Board) => {
    const lines = [
      [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
      ],
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
      ],
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      [
        [0, 2],
        [1, 1],
        [2, 0],
      ],
    ];

    for (const line of lines) {
      const [[r1, c1], [r2, c2], [r3, c3]] = line;
      const v1 = b[r1][c1];
      const v2 = b[r2][c2];
      const v3 = b[r3][c3];
      if (v1 && v1 === v2 && v2 === v3) {
        return {
          winner: v1 as PlayerSymbol,
          cells: line.map(([r, c]) => ({ row: r, col: c })),
        };
      }
    }

    if (isBoardFull(b)) {
      return { winner: "draw" as const, cells: [] };
    }

    return { winner: null, cells: [] };
  };

  const resetForNewGame = (mode: GameMode, time?: number) => {
    setBoard(createEmptyBoard());
    setCurrentPlayer("X");
    setWinner(null);
    setWinningCells([]);
    setGameMode(mode);
    setMoveTime(mode === "timed" ? time : undefined);

    const now = Date.now();
    setCurrentMoveStartTime(now);

    if (mode === "timed" && time) {
      setRemainingTime(time);
    } else {
      setRemainingTime(null);
    }
  };

  const handleModeSelect = (mode: GameMode, time?: number) => {
    setShowModal(false);
    resetForNewGame(mode, time);
  };

  useEffect(() => {
    if (gameMode !== "timed" || !moveTime || winner || showModal) return;
    if (remainingTime === null) return;

    if (remainingTime <= 0) {
      handleTimeout();
      return;
    }

    const timerId = window.setTimeout(() => {
      setRemainingTime((prev) => (prev !== null ? prev - 1 : prev));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [remainingTime, gameMode, moveTime, winner, showModal]);

  const handleTimeout = () => {
    if (winner || gameMode !== "timed" || !moveTime) return;





    const nextPlayer: PlayerSymbol = currentPlayer === "X" ? "O" : "X";
    setCurrentPlayer(nextPlayer);
    setCurrentMoveStartTime(Date.now());
    setRemainingTime(moveTime);
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (winner) return;
    if (board[rowIndex][colIndex] !== null) return;

    const newBoard = board.map((row) => [...row]);
    newBoard[rowIndex][colIndex] = currentPlayer;

    const now = Date.now();
    const timeTaken =
      currentMoveStartTime !== null ? (now - currentMoveStartTime) / 1000 : 0;

    setBoard(newBoard);

    const result = checkWinner(newBoard);

    if (result.winner === "X" || result.winner === "O") {
      setWinner(result.winner);
      setWinningCells(result.cells);
      setCurrentMoveStartTime(null);
      setRemainingTime(null);
      setScores((prev) => ({
        ...prev,
        [result.winner!]: prev[result.winner!] + 1,
      }));
      return;
    }

    if (result.winner === "draw") {
      setWinner("draw");
      setWinningCells([]);
      setCurrentMoveStartTime(null);
      setRemainingTime(null);
      return;
    }

    const nextPlayer: PlayerSymbol = currentPlayer === "X" ? "O" : "X";
    setCurrentPlayer(nextPlayer);
    setCurrentMoveStartTime(Date.now());
    if (gameMode === "timed" && moveTime) {
      setRemainingTime(moveTime);
    }
  };

  const statusText = useMemo(() => {
    if (winner === "draw") return "It's a draw!";
    if (winner === "X" || winner === "O") {
      const winnerName = playerNames[winner] || winner;
      return `${winnerName} wins!`;
    }
    const currentName = playerNames[currentPlayer] || currentPlayer;
    return `${currentName}'s turn`;
  }, [winner, currentPlayer, playerNames]);

  const handlePlayAgain = () => {
    setShowModal(true);
  };

  const isWinningCell = (row: number, col: number) =>
    winningCells.some((c) => c.row === row && c.col === col);

  const handleNicknameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const player1Name = formData.get("player1") as string;
    const player2Name = formData.get("player2") as string;

    if (player1Name.trim() && player2Name.trim()) {
      setPlayerNames({ X: player1Name.trim(), O: player2Name.trim() });
      setShowNicknameModal(false);
      setShowModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 gap-6 bg-white">
      {showNicknameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_black] p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-center mb-6 text-black">
              Enter Player Names
            </h2>
            <form onSubmit={handleNicknameSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="player1" className="block text-sm font-semibold mb-2 text-black">
                  Player 1 (X):
                </label>
                <input
                  type="text"
                  id="player1"
                  name="player1"
                  required
                  maxLength={20}
                  className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter name..."
                />
              </div>
              <div>
                <label htmlFor="player2" className="block text-sm font-semibold mb-2 text-black">
                  Player 2 (O):
                </label>
                <input
                  type="text"
                  id="player2"
                  name="player2"
                  required
                  maxLength={20}
                  className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter name..."
                />
              </div>
              <button
                type="submit"
                className="mt-4 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}

      {showModal && <ModeSelectionModal onSelect={handleModeSelect} />}

      <h1 className="text-center text-2xl sm:text-3xl font-bold mt-4 text-black">
        Tic-Tac-Toe
      </h1>

      <div className="bg-yellow-100 border-2 border-yellow-600 rounded-lg px-4 py-2 text-center">
        <p className="text-sm font-semibold text-yellow-800">
          ⚠️ Offline game - Results not stored
        </p>
      </div>

      <p className="text-center text-sm sm:text-base text-black">
        {statusText}
      </p>

      {gameMode === "timed" && moveTime && !winner && (
        <p className="text-center text-xs sm:text-sm text-black font-semibold">
          Time left for {playerNames[currentPlayer] || currentPlayer}:{" "}
          {remainingTime !== null ? `${remainingTime}s` : `${moveTime}s`}
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-6 md:gap-10 justify-center items-center w-full max-w-4xl">
        <PlayerCard
          avatarUrl={""}
          player={{
            userId: "player1",
            username: playerNames.X || "Player 1",
          }}
          symbol="X"
          isCurrentTurn={currentPlayer === "X" && !winner}
          isYou={true}
          score={scores.X}
        />

        <div
          className={`
            bg-white border border-black p-3 sm:p-4 rounded-lg shadow-[4px_4px_0px_0px_black]
            ${winner ? "opacity-80" : ""}
          `}
        >
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {row.map((cell, colIndex) => {
                const isTop = rowIndex === 0;
                const isLeft = colIndex === 0;
                const winning = isWinningCell(rowIndex, colIndex);

                return (
                  <button
                    key={colIndex}
                    type="button"
                    disabled={!!winner || cell !== null}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    className={`
                      aspect-square 
                      w-16 sm:w-20 md:w-24 
                      flex justify-center items-center 
                      text-xl sm:text-2xl 
                      border-black 
                      ${!isTop ? "border-t-2" : ""}
                      ${!isLeft ? "border-l-2" : ""}
                      ${cell === null ? "hover:bg-gray-200" : ""}
                      ${winning ? "bg-gray-300" : "bg-white"}
                      transition-colors
                    `}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <PlayerCard
          avatarUrl={""}
          player={{
            userId: "player2",
            username: playerNames.O || "Player 2",
          }}
          symbol="O"
          isCurrentTurn={currentPlayer === "O" && !winner}
          isYou={false}
          score={scores.O}
        />
      </div>


      {winner && (
        <button
          type="button"
          onClick={handlePlayAgain}
          className="mt-2 bg-black text-white px-4 py-2 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-900"
        >
          Play Again
        </button>
      )}
    </div>
  );
};

export default PlayGame;
