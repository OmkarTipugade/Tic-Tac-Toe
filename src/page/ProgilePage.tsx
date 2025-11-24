import React, { useEffect, useState } from "react";


type AccountInfo = {
  userId: string;
  username: string;
  email?: string;
};

type PlayerStats = {
  wins: number;
  losses: number;
  draws: number;
  score: number;
};

const ProfilePage: React.FC = () => {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const load = async () => {
//       if (!session) return;

//       try {
//         const res = await Nakama.client.getAccount(session);
//         setAccount({
//           userId: res?.user?.id!,
//           username: res?.user?.username!,
//           email: res.email,
//         });

//         const playerStats = await getPlayerStats();
//         if (playerStats) setStats(playerStats);
//       } catch (err) {
//         console.error("Failed to load profile", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     load();
//   }, [session, getPlayerStats]);

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
  const winRate = totalGames ? ((stats!.wins / totalGames) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 bg-white">
      <div className="bg-white border border-black rounded-xl shadow-[6px_6px_0px_0px_black] p-8 w-full max-w-3xl">
        <h1 className="text-4xl font-extrabold mb-10 text-center text-black tracking-wide">
          Profile
        </h1>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold mb-6 text-black">Account Info</h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-600">Username</p>
                <p className="text-xl font-semibold text-black">{account.username}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-600">Email</p>
                <p className="text-xl font-semibold text-black">{account.email ?? "Not set"}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-600">User ID</p>
                <p className="font-mono text-xs bg-gray-100 border border-black rounded px-2 py-1 mt-1">
                  {account.userId}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 text-black">Game Statistics</h2>

            {stats ? (
              <div className="space-y-5">
                <div className="bg-gray-100 border border-black p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-700">Total Score</p>
                  <p className="text-3xl font-bold text-black mt-1">{stats.score}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-black rounded-lg p-3 text-center bg-white">
                    <p className="text-xs text-gray-700">Wins</p>
                    <p className="text-2xl font-bold text-black">{stats.wins}</p>
                  </div>
                  <div className="border border-black rounded-lg p-3 text-center bg-white">
                    <p className="text-xs text-gray-700">Losses</p>
                    <p className="text-2xl font-bold text-black">{stats.losses}</p>
                  </div>
                  <div className="border border-black rounded-lg p-3 text-center bg-white">
                    <p className="text-xs text-gray-700">Draws</p>
                    <p className="text-2xl font-bold text-black">{stats.draws}</p>
                  </div>
                </div>

                <div className="border border-black rounded-lg p-3 bg-white">
                  <p className="text-sm text-gray-700">Win Rate</p>
                  <p className="text-xl font-bold text-black mt-1">{winRate}%</p>
                </div>

                <div className="border border-black rounded-lg p-3 bg-white">
                  <p className="text-sm text-gray-700">Total Games</p>
                  <p className="text-xl font-bold text-black mt-1">{totalGames}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">No game statistics yet. Play some games!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
