import React, { Activity } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import SignIn from "./page/auth/SignIn";
import SignUp from "./page/auth/SignUp";
import PlayGame from "./page/PlayGame";
import AuthLayout from "./layout/AuthLayout";
import DefaultLayout from "./layout/DefaultLayout";
import Home from "./page/Home";
import GameLayout from "./layout/GameLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Leaderboard from "./page/Leaderboard";
import ProfilePage from "./page/ProgilePage";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route element={<GameLayout />}>
            <Route path="/offline-game" element={<PlayGame />} />
          </Route>
        </Route>
        <Route element={<DefaultLayout />}>
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/" element={<Home />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/profile"
              element={
                <Activity mode={localStorage.getItem("logged_user") ? "visible" : "hidden"}>
                  <ProfilePage />
                </Activity>
              }
            />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>

        </Route>
      </Routes>

    </BrowserRouter>
  );
};

export default App;
