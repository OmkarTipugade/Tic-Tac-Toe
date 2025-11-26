import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import countries from "../utils/countries";
import { avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8 } from "../assets/avatars/avatars";
import { nkClient } from "../services/nakama-client";
import { Session } from "@heroiclabs/nakama-js";

type AccountInfo = {
  userId: string;
  username: string;
  email?: string;
  location?: string;
  avatarUrl?: string;
};

type PlayerStats = {
  wins: number;
  losses: number;
  draws: number;
  score: number;
  winStreak: number;
  bestWinStreak: number;
};

type GameHistory = {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  date: string;
  mode: string;
};

const PRESET_AVATARS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8];

const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    username: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Load account info from auth context
        setAccount({
          userId: user.user_id || "",
          username: user.username || "",
          email: user.email || "",
          location: user.location || "",
          avatarUrl: user.avatarUrl || "",
        });

        setSelectedCountry(user.location || "");
        setSelectedAvatar(user.avatarUrl || "");

        setEditForm({
          username: user.username || "",
        });

        // Fetch player stats from backend
        try {
          const sessionStr = localStorage.getItem("user_session");
          if (sessionStr) {
            const sessionData = JSON.parse(sessionStr);
            const session = Session.restore(sessionData.token, sessionData.refresh_token);

            const response = await nkClient.rpc(session, 'get_player_stats', {});
            const payloadStr = typeof response.payload === 'string' ? response.payload : JSON.stringify(response.payload);
            const payload = JSON.parse(payloadStr);

            if (payload.success && payload.stats) {
              const fetchedStats = payload.stats;
              const totalGames = fetchedStats.wins + fetchedStats.losses + fetchedStats.draws;
              const winPercentage = totalGames > 0 ? (fetchedStats.wins / totalGames) * 100 : 0;

              setStats({
                ...fetchedStats,
                bestWinStreak: fetchedStats.winStreak, // Using current as best for now
              });
            } else {
              // Fallback to zeros if no stats
              setStats({
                wins: 0,
                losses: 0,
                draws: 0,
                score: 0,
                winStreak: 0,
                bestWinStreak: 0,
              });
            }
          }
        } catch (statsError) {
          console.error('Failed to fetch stats:', statsError);
          // Fallback to zeros on error
          setStats({
            wins: 0,
            losses: 0,
            draws: 0,
            score: 0,
            winStreak: 0,
            bestWinStreak: 0,
          });
        }

        setGameHistory([]);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSaveChanges = async () => {
    if (!user) return;

    // Validate username
    if (!editForm.username || editForm.username.trim().length === 0) {
      toast.error("Username cannot be empty");
      return;
    }

    if (editForm.username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    try {
      const sessionStr = localStorage.getItem("user_session");

      if (!sessionStr) {
        toast.error("No active session found. Please login again.");
        return;
      }

      const sessionData = JSON.parse(sessionStr);

      if (!sessionData.token) {
        toast.error("Invalid session. Please login again.");
        return;
      }

      console.log("Updating account on Nakama server...");

      const session = Session.restore(
        sessionData.token,
        sessionData.refresh_token
      );

      // Call backend RPC to update profile
      const response = await nkClient.rpc(session, "update_user_profile", {
        username: editForm.username,
        display_name: editForm.username,
        location: selectedCountry,
        avatar_url: selectedAvatar
      });

      const result = JSON.parse(
        typeof response.payload === "string"
          ? response.payload
          : JSON.stringify(response.payload)
      );

      if (!result.success) {
        throw new Error(result.error || "Update failed");
      }

      console.log("Nakama update successful!", result);

      const updatedUser = {
        ...user,
        username: editForm.username,
        location: selectedCountry,
        avatarUrl: selectedAvatar,
      };

      localStorage.setItem("logged_user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      setAccount((prev) =>
        prev
          ? {
            ...prev,
            username: editForm.username,
            location: selectedCountry,
            avatarUrl: selectedAvatar,
          }
          : null
      );

      setIsEditing(false);
      toast.success("Profile updated successfully!");

    } catch (err: any) {
      console.error("Failed to update profile", err);
      toast.error(err.message || "Failed to update profile");
      // Don't change edit state on error, so user can try again
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      username: account?.username || "",
    });
    setSelectedCountry(account?.location || "");
    setSelectedAvatar(account?.avatarUrl || "");
    setIsEditing(false);
  };

  const handleAvatarSelect = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    setShowAvatarModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size should be less than 2MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSelectedAvatar(result);
        setShowAvatarModal(false);
      };
      reader.readAsDataURL(file);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-white">
        <p className="text-black text-lg">Loading profile...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-white">
        <p className="text-black text-lg">Could not load profile.</p>
      </div>
    );
  }

  const totalGames = stats ? stats.wins + stats.losses + stats.draws : 0;
  const winRate = totalGames
    ? ((stats!.wins / totalGames) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)] px-4 py-8 bg-white">
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_black] p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-center mb-6 text-black">
              Choose Avatar
            </h2>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Preset Avatars</h3>
              <div className="grid grid-cols-4 gap-4">
                {PRESET_AVATARS.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => handleAvatarSelect(avatar)}
                    className={`w-full aspect-square rounded-lg border-2 hover:border-black transition overflow-hidden ${selectedAvatar === avatar ? "border-black ring-2 ring-black" : "border-gray-300"
                      }`}
                  >
                    <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload Custom Avatar</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-400 rounded-lg hover:border-black transition text-gray-700 hover:text-black"
              >
                📁 Click to upload image (max 2MB)
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAvatarModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_black] p-8 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-black tracking-wide">
            Profile
          </h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div>
            <h2 className="text-2xl font-bold mb-6 text-black">
              Account Info
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-600 mb-2">
                  Avatar
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-3xl overflow-hidden border-2 border-gray-300">
                    {selectedAvatar ? (
                      <img
                        src={selectedAvatar}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      account.username?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      Change Avatar
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-600 mb-2">
                  Country
                </p>
                {isEditing ? (
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="text-xl font-semibold text-black border-2 border-gray-300 rounded px-3 py-2 w-full focus:border-black focus:outline-none"
                  >
                    <option value="">Select your country</option>
                    {countries.map((country, index) => (
                      <option key={index} value={country.name}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xl font-semibold text-black">
                    {account.location ? (
                      <>
                        {countries.find(c => c.name === account.location)?.flag} {account.location}
                      </>
                    ) : (
                      "Not set"
                    )}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">
                  Username
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    className="text-xl font-semibold text-black border-2 border-gray-300 rounded px-3 py-2 w-full focus:border-black focus:outline-none"
                  />
                ) : (
                  <p className="text-xl font-semibold text-black">
                    {account.username}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">
                  Email
                </p>
                <p className="text-xl font-semibold text-black">
                  {account.email ?? "Not set"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">
                  User ID
                </p>
                <p className="font-mono text-xs bg-gray-100 border border-black rounded px-2 py-1 mt-1">
                  {account.userId}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 text-black">
              Game Statistics
            </h2>

            {stats ? (
              <div className="space-y-5">
                <div className="bg-gray-100 border-2 border-black p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-700">Total Score</p>
                  <p className="text-3xl font-bold text-black mt-1">
                    {stats.score}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-black p-3 rounded-lg">
                    <p className="text-xs text-gray-700">Current Streak</p>
                    <p className="text-2xl font-bold text-orange-600">
                      🔥 {stats.winStreak}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-black p-3 rounded-lg">
                    <p className="text-xs text-gray-700">Best Streak</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ⭐ {stats.bestWinStreak}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="border-2 border-black rounded-lg p-3 text-center bg-white">
                    <p className="text-xs text-gray-700">Wins</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.wins}
                    </p>
                  </div>
                  <div className="border-2 border-black rounded-lg p-3 text-center bg-white">
                    <p className="text-xs text-gray-700">Losses</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.losses}
                    </p>
                  </div>
                  <div className="border-2 border-black rounded-lg p-3 text-center bg-white">
                    <p className="text-xs text-gray-700">Draws</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {stats.draws}
                    </p>
                  </div>
                </div>

                <div className="border-2 border-black rounded-lg p-3 bg-white">
                  <p className="text-sm text-gray-700">Win Rate</p>
                  <p className="text-xl font-bold text-black mt-1">
                    {winRate}%
                  </p>
                </div>

                <div className="border-2 border-black rounded-lg p-3 bg-white">
                  <p className="text-sm text-gray-700">Total Games</p>
                  <p className="text-xl font-bold text-black mt-1">
                    {totalGames}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">
                No game statistics yet. Play some games!
              </p>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6 text-black">Game History</h2>

          {gameHistory.length > 0 ? (
            <div className="space-y-3">
              {gameHistory.map((game) => (
                <div
                  key={game.id}
                  className="border-2 border-black rounded-lg p-4 bg-white hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-black">
                        vs {game.opponent}
                      </p>
                      <p className="text-sm text-gray-600">
                        {game.mode} • {game.date}
                      </p>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg font-bold ${game.result === "win"
                        ? "bg-green-100 text-green-700"
                        : game.result === "loss"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {game.result.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-600">
                No game history yet. Start playing to build your record!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
