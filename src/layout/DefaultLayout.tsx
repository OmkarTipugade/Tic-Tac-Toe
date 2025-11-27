import React from "react";
import { Outlet } from "react-router";
import Navbar from "../components/Navbar";

const DefaultLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-grow"> {/* This div ensures Outlet takes available space */}
        <Outlet />
      </div>

      {/* Footer with copyright */}
      <footer className="mt-auto bg-gray-50 border-t border-gray-200 py-3 text-center text-xs text-gray-600">
        © 2025 Multiplayer Tic-Tac-Toe. All rights reserved.
      </footer>
    </div>
  );
};

export default DefaultLayout;
