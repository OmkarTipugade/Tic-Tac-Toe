import React from "react";
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
import { AuthProvider } from "./context/AuthContext";
import MultiplayerGame from "./page/MultiplayerGame";

const App: React.FC = () => {
  return (
    <AuthProvider>
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
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<GameLayout />}>
              <Route path="/multiplayer" element={<MultiplayerGame />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
