import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { nkClient } from '../services/nakama-client';
import { Session } from '@heroiclabs/nakama-js';

interface LeaderboardEntry {
  rank: number;
  ownerId: string;
  username: string;
  location: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  // Only redirect to sign-in if loadLeaderboard fails to find a valid session
  // Don't use isAuthenticated here because of timing issues with AuthContext updates

  useEffect(() => {
    // Load immediately on mount
    loadLeaderboard();

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      loadLeaderboard();
    }, 10000);

    // Refresh when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadLeaderboard();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Only run once on mount

  const loadLeaderboard = async () => {
    try {
      setError(null);

      // Get session data from localStorage
      const sessionData = localStorage.getItem('user_session');

      if (!sessionData) {
        console.error('No session found in localStorage');
        setError('Please log in to view the leaderboard');
        setLoading(false);
        navigate('/sign-in', { state: { from: '/leaderboard' } });
        return;
      }

      // Parse session data
      const parsedSession = JSON.parse(sessionData);

      if (!parsedSession.user_id || !parsedSession.token) {
        console.error('Invalid session data');
        setError('Please log in to view the leaderboard');
        setLoading(false);
        navigate('/sign-in', { state: { from: '/leaderboard' } });
        return;
      }

      setMyUserId(parsedSession.user_id);

      // Restore Session from token and refresh_token
      let sessionObj = Session.restore(
        parsedSession.token,
        parsedSession.refresh_token
      );

      // Check if session is expired (pass current time in seconds)
      if (sessionObj.isexpired(Date.now() / 1000)) {
        console.log('Session expired, attempting to refresh...');
        try {
          // Try to refresh the session
          const newSession = await nkClient.sessionRefresh(sessionObj);
          // Update localStorage with new session
          localStorage.setItem('user_session', JSON.stringify({
            token: newSession.token,
            refresh_token: newSession.refresh_token,
            user_id: newSession.user_id,
            username: newSession.username
          }));
          // Use the refreshed session
          sessionObj = newSession;
          console.log('Session refreshed successfully');
        } catch (refreshError) {
          console.error('Failed to refresh session:', refreshError);
          setError('Session expired. Please log in again.');
          setLoading(false);
          navigate('/sign-in', { state: { from: '/leaderboard' } });
          return;
        }
      }

      // Call RPC to get leaderboard from storage (always shows current scores)
      const response = await nkClient.rpc(sessionObj, 'get_leaderboard', { limit: 100 });

      console.log('Leaderboard RPC response:', response);

      const result = typeof response.payload === 'string' ? JSON.parse(response.payload) : response.payload;

      if (result.success && result.leaderboard) {
        const formattedEntries: LeaderboardEntry[] = result.leaderboard.map((player: any, index: number) => ({
          rank: index + 1,
          ownerId: player.userId || '',
          username: player.username || 'Player',
          location: player.location || '',
          score: player.score || 0,
          wins: player.wins || 0,
          losses: player.losses || 0,
          draws: player.draws || 0
        }));
        setEntries(formattedEntries);
      } else {
        setEntries([]);
      }
    } catch (err: any) {
      console.error('Leaderboard error:', err);
      setError('Failed to load leaderboard: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black mb-4"></div>
        <p className="text-xl text-black font-semibold">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">🏆 Global Leaderboard</h1>
          <p className="text-gray-600">Top Players Ranked by Score</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-lg text-center font-semibold">
            {error}
          </div>
        )}



        {/* Leaderboard Table */}
        <div className="bg-white border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_black] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-black">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-black uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-black uppercase tracking-wider">
                    Wins
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-black uppercase tracking-wider">
                    Losses
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-black uppercase tracking-wider">
                    Draws
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y-2 divide-gray-200">
                {entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <div className="text-6xl mb-4">🎮</div>
                      <p className="text-lg font-semibold">No players yet!</p>
                      <p className="text-sm mt-2">Be the first to play and climb the ranks!</p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const isCurrentUser = myUserId && entry.ownerId === myUserId;
                    return (
                      <tr
                        key={entry.ownerId}
                        className={`transition-colors ${isCurrentUser ? 'bg-yellow-50 border-2 border-yellow-400' : 'hover:bg-gray-50'
                          }`}
                      >
                        {/* Rank */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {entry.rank === 1 && <span className="text-3xl">🥇</span>}
                            {entry.rank === 2 && <span className="text-3xl">🥈</span>}
                            {entry.rank === 3 && <span className="text-3xl">🥉</span>}
                            <span className={`text-sm font-bold ${entry.rank <= 3 ? 'text-xl' : 'text-black'
                              }`}>
                              #{entry.rank}
                            </span>
                          </div>
                        </td>

                        {/* Player */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isCurrentUser ? 'text-yellow-700' : 'text-black'
                              }`}>
                              {entry.username}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs bg-yellow-400 text-black px-2 py-1 rounded-full font-semibold">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">
                            {entry.location || '-'}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-4 text-center">
                          <span className="text-lg font-bold text-black">
                            {entry.score}
                          </span>
                        </td>

                        {/* Wins */}
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-semibold text-green-600">
                            {entry.wins}
                          </span>
                        </td>

                        {/* Losses */}
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-semibold text-red-600">
                            {entry.losses}
                          </span>
                        </td>

                        {/* Draws */}
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-semibold text-gray-600">
                            {entry.draws}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={loadLeaderboard}
            className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
          >
            🔄 Refresh
          </button>

          <button
            onClick={() => navigate('/')}
            className="bg-white border-2 border-black text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
          >
            ← Back to Home
          </button>
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
          <h3 className="font-bold text-black mb-2">📊 Scoring System</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Win: <span className="font-semibold text-green-600">+15 points</span></p>
            <p>• Loss: <span className="font-semibold text-red-600">−15 points</span></p>
            <p>• Draw: <span className="font-semibold text-gray-600">+7 points</span></p>
            <p>• Leaderboard keeps your BEST score ever achieved</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
