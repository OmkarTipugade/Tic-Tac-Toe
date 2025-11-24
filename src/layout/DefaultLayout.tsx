import React from "react";
import { Outlet } from "react-router";
import Navbar from "../components/Navbar";

const DefaultLayout: React.FC = () => {
  return (
    <>
      <Navbar />
      <>
        <Outlet />
      </>
    </>
  );
};

export default DefaultLayout;
