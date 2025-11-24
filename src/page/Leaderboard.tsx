import React, { useEffect, useState } from "react";

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
}

const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   loadLeaderboard();
  // }, []);

  // const loadLeaderboard = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     const result = await getLeaderboard(20);

  //     if (result && result.records) {
  //       const formattedEntries = result.records.map((record: any, index: number) => ({
  //         rank: index + 1,
  //         username: record.username || "Anonymous",
  //         score: record.score,
  //         wins: 0,
  //         losses: 0,
  //         draws: 0,
  //         streak: record.streak || 0
  //       }));
  //       setEntries(formattedEntries);
  //     }
  //   } catch (err: any) {
  //     setError("Failed to load leaderboard");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-xl text-black">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-black">
          Global Leaderboard
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-gray-200 text-black rounded-lg border border-black">
            {error}
          </div>
        )}

        <div className="bg-white border border-black rounded-lg shadow-[4px_4px_0px_0px_black] overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-black">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  Streak
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-black">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-gray-600"
                  >
                    No entries yet. Be the first to play!
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.rank} className="">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-black">
                        {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                        {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                        {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                        <span className="text-sm font-semibold">#{entry.rank}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-black text-sm font-semibold">
                      {entry.username}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-black text-sm">
                      {entry.score}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-black text-sm font-semibold">
                      {entry.streak}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-center">
          <button
            // onClick={loadLeaderboard}
            className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-900 transition"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
