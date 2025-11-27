import React from "react";
import { Outlet } from "react-router";

const GameLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-grow">
        <Outlet />
      </div>
      <footer className="mt-auto bg-gray-50 border-t border-gray-200 py-3 text-center text-xs text-gray-600">
        © 2025 Multiplayer Tic-Tac-Toe. All rights reserved.
      </footer>
    </div>
  );
};

export default GameLayout;
