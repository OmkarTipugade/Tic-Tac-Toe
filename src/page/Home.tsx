import React from "react";
import boardImage from "../assets/board-img.png";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleMultiplayerClick = () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to play multiplayer');
      navigate('/sign-in', { state: { from: '/multiplayer' } });
    } else {
      navigate('/multiplayer');
    }
  };

  return (
    <div className="flex flex-col-reverse md:flex-row items-center justify-between md:justify-around p-6 md:p-10 gap-10 bg-white">
      <div className="flex flex-col gap-4 text-center md:text-left">
        <h1 className="text-black text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
          Play Tic Tac Toe
        </h1>

        <button
          type="button"
          onClick={() => navigate("/offline-game")}
          className="text-lg sm:text-xl md:text-2xl font-semibold 
                     py-2 px-5 rounded text-white 
                     bg-black hover:bg-gray-800 
                     transition-all duration-200 self-center md:self-start cursor-pointer"
        >
          Play Offline
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={handleMultiplayerClick}
            className="text-lg sm:text-xl md:text-2xl font-semibold 
                       py-2 px-3 rounded text-white
                       bg-gray-700 hover:bg-gray-900 
                       transition-all duration-200 self-center md:self-start cursor-pointer"
          >
            Play Multiplayer
          </button>
          {!isAuthenticated && (
            <span className="text-xs text-gray-600 mt-1 block text-center md:text-left">
              🔒 Sign in required
            </span>
          )}
        </div>
      </div>

      <img
        src={boardImage}
        alt="Board"
        className="w-48 h-48 sm:w-64 sm:h-64 md:w-[350px] md:h-[350px]"
      />
    </div>
  );
};

export default Home;
