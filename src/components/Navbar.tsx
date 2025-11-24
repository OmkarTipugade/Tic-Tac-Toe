import React, { Activity, useState } from "react";
import { Link } from "react-router";

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white shadow-md px-4 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/">
            <h1 className="text-2xl font-bold cursor-pointer whitespace-nowrap">
              XO Tic-Tac-Toe
            </h1>
          </Link>

          <div className="hidden md:flex gap-4 items-center">
            <Link
              to="/offline-game"
              className="text-lg cursor-pointer text-gray-700 hover:text-black"
            >
              Play
            </Link>
            <Link
              to="/leaderboard"
              className="text-lg cursor-pointer text-gray-700 hover:text-black"
            >
              Leaderboard
            </Link>
          </div>
        </div>

        <div className="hidden md:flex gap-4 items-center">
          <Link
            to="/sign-in"
            className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-100"
          >
            Sign In
          </Link>
          <Link
            to="/sign-up"
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Sign Up
          </Link>
        </div>

        <button
          className="md:hidden text-3xl"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? "✖" : "☰"}
        </button>
      </div>

      <Activity mode={menuOpen ? "visible" : "hidden"}>
        <div className="md:hidden mt-3 flex flex-col gap-3 animate-slideDown">
          <Link
            to="/offline-game"
            onClick={() => setMenuOpen(false)}
            className="text-lg text-gray-700 hover:text-black"
          >
            Play
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setMenuOpen(false)}
            className="text-lg text-gray-700 hover:text-black"
          >
            Leaderboard
          </Link>
          <Link
            to="/sign-in"
            onClick={() => setMenuOpen(false)}
            className="text-lg text-gray-700 hover:text-black"
          >
            Sign In
          </Link>
          <Link
            to="/sign-up"
            onClick={() => setMenuOpen(false)}
            className="text-lg text-gray-700 hover:text-black"
          >
            Sign Up
          </Link>
        </div>
      </Activity>
    </nav>
  );
};

export default Navbar;
