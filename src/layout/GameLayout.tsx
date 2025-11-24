import React from "react";
import { Outlet } from "react-router";

const GameLayout:React.FC = () => {
  return (
    <>
      <Outlet />
    </>
  );
};

export default GameLayout;
