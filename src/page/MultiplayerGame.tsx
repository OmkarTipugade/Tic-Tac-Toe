import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import PlayerCard from '../components/PlayerCard';
import ModeSelectionModal from '../components/ModeSelectionModal';
import MoveSummary from '../components/MoveSummary';
import { nkClient } from '../services/nakama-client';
import { NakamaMatchService } from '../services/nakama-match';
import type { MatchPlayer, PlayerStats, Moves } from '../types/types';
import { useAuth } from '../context/AuthContext';
import { Session } from '@heroiclabs/nakama-js';

type GameMode = 'classic' | 'timed';
type GameStatus = 'idle' | 'connecting' | 'finding_match' | 'waiting_for_opponent' | 'playing' | 'finished';

const MultiplayerGame: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [showModeModal, setShowModeModal] = useState(true);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [board, setBoard] = useState<string[]>(Array(9).fill(''));
  const [players, setPlayers] = useState<{ [userId: string]: MatchPlayer }>({});
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [myUserId, setMyUserId] = useState<string>('');
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [playerStats, setPlayerStats] = useState<{ [userId: string]: PlayerStats }>({});
  const [moves, setMoves] = useState<Moves[]>([]);
  const [moveStartTime, setMoveStartTime] = useState<number>(Date.now());
  const [playerAvatars, setPlayerAvatars] = useState<{ [userId: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const matchServiceRef = useRef<NakamaMatchService | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please sign in to play multiplayer');
      navigate('/sign-in', { state: { from: '/multiplayer' } });
    }
  }, [isAuthenticated, navigate]);

  // Get my player info
  const myPlayer = myUserId ? players[myUserId] : null;
  const mySymbol = myPlayer?.symbol;

  // Get opponent info
  const opponentId = Object.keys(players).find(id => id !== myUserId);
  const opponent = opponentId ? players[opponentId] : null;

  // Check if it's my turn
  const isMyTurn = currentTurn === myUserId && gameStatus === 'playing';

  // Helper function to fetch player stats
  const fetchPlayerStats = async (userId: string, session: any): Promise<PlayerStats> => {
    try {
      const response = await nkClient.rpc(session, 'get_player_stats', {});
      const payload = typeof response.payload === 'string' ? JSON.parse(response.payload) : response.payload;

      if (payload.success && payload.stats) {
        const stats = payload.stats;
        const totalGames = stats.wins + stats.losses + stats.draws;
        const winPercentage = totalGames > 0 ? (stats.wins / totalGames) * 100 : 0;

        return {
          ...stats,
          winPercentage
        };
      }
    } catch (error) {
      console.error('Failed to fetch player stats:', error);
    }

    return { score: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, winPercentage: 0 };
  };

  // Helper function to update player stats
  const updatePlayerStats = async (isWin: boolean, isDraw: boolean, session: any) => {
    try {
      const response = await nkClient.rpc(session, 'update_player_stats', {
        isWin,
        isDraw
      });

      const payload = typeof response.payload === 'string' ? JSON.parse(response.payload) : response.payload;

      if (payload.success && payload.stats) {
        const stats = payload.stats;
        const totalGames = stats.wins + stats.losses + stats.draws;
        const winPercentage = totalGames > 0 ? (stats.wins / totalGames) * 100 : 0;

        return {
          ...stats,
          winPercentage
        };
      }
    } catch (error) {
      console.error('Failed to update player stats:', error);
    }

    return null;
  };

  const handleModeSelect = async (mode: GameMode, time?: number) => {
    setShowModeModal(false);
    setGameMode(mode);
    setTimeLimit(time);
    await initializeGame(mode, time);
  };


  const initializeGame = async (mode: GameMode, time?: number) => {
    try {
      setGameStatus('connecting');
      setErrorMessage('');

      const sessionData = localStorage.getItem('user_session');
      if (!sessionData) {
        setErrorMessage('No active session. Please sign in again.');
        toast.error('Session expired. Please sign in again.');
        navigate('/sign-in');
        return;
      }

      const parsedSession = JSON.parse(sessionData);

      if (!parsedSession.token) {
        setErrorMessage('Invalid session. Please sign in again.');
        toast.error('Session expired. Please sign in again.');
        navigate('/sign-in');
        return;
      }

      // Restore the Session object properly
      const session = Session.restore(
        parsedSession.token,
        parsedSession.refresh_token
      );

      if (!session.user_id) {
        throw new Error('Failed to get user ID from session');
      }
      setMyUserId(session.user_id);

      // Create match service
      const matchService = new NakamaMatchService(nkClient, session);
      matchServiceRef.current = matchService;

      // Set up callbacks for real-time updates
      matchService.setCallbacks({
        onPlayerJoined: async (player) => {
          console.log('Player joined:', player);
          setPlayers(prev => ({
            ...prev,
            [player.userId]: player
          }));

          // Fetch stats for the joined player
          const stats = await fetchPlayerStats(player.userId, session);
          setPlayerStats(prev => ({
            ...prev,
            [player.userId]: stats
          }));

          // Fetch avatar from user account
          try {
            const response = await nkClient.rpc(session, 'get_user_account', {});
            const payloadStr = typeof response.payload === 'string' ? response.payload : JSON.stringify(response.payload);
            const payload = JSON.parse(payloadStr);

            if (payload.success && payload.account.user.avatar_url) {
              setPlayerAvatars(prev => ({
                ...prev,
                [player.userId]: payload.account.user.avatar_url
              }));
            }
          } catch (error) {
            console.error('Failed to fetch avatar:', error);
          }
        },
        onGameStart: async (data) => {
          console.log('Game started:', data);
          setPlayers(data.players);
          setCurrentTurn(data.currentTurn);
          setGameStatus('playing');
          setMoveStartTime(Date.now());

          // Fetch stats for all players
          for (const userId of Object.keys(data.players)) {
            const stats

              = await fetchPlayerStats(userId, session);
            setPlayerStats(prev => ({
              ...prev,
              [userId]: stats
            }));
          }

          toast.success('Game started! Good luck!');
        },
        onMoveMade: (data) => {
          console.log('Move made:', data);
          setBoard(data.board);

          // Track move for Timed mode
          if (mode === 'timed') {
            const timeTaken = (Date.now() - moveStartTime) / 1000;
            const moveNumber = moves.length + 1;
            const playerSymbol = data.symbol as 'X' | 'O';

            setMoves(prev => [...prev, {
              moveNo: moveNumber,
              player: playerSymbol,
              row: Math.floor(data.position / 3),
              col: data.position % 3,
              timeTaken,
              result: 'normal'
            }]);
            setMoveStartTime(Date.now());
          }

          setCurrentTurn(data.currentTurn);
        },
        onGameOver: async (data) => {
          console.log('Game over:', data);
          setBoard(data.board);
          setWinner(data.winner || null);
          setIsDraw(data.isDraw);
          setGameStatus('finished');

          // Update stats for both players
          if (data.isDraw) {
            // Both players get +7 for draw
            const updatedStats = await updatePlayerStats(false, true, session);
            if (updatedStats) {
              setPlayerStats(prev => ({
                ...prev,
                [myUserId]: updatedStats
              }));
            }
            toast.info("It's a draw! +7 points");
          } else if (data.winner === myUserId) {
            // Winner gets +15
            const updatedStats = await updatePlayerStats(true, false, session);
            if (updatedStats) {
              setPlayerStats(prev => ({
                ...prev,
                [myUserId]: updatedStats
              }));
            }
            toast.success('You won! +15 points 🎉');
          } else {
            // Loser gets -15
            const updatedStats = await updatePlayerStats(false, false, session);
            if (updatedStats) {
              setPlayerStats(prev => ({
                ...prev,
                [myUserId]: updatedStats
              }));
            }
            toast.info('You lost. -15 points. Better luck next time!');
          }
        },
        onPlayerDisconnected: (userId) => {
          console.log('Player disconnected:', userId);
          toast.warning('Opponent disconnected');
          setErrorMessage('Opponent disconnected from the game');
        },
        onError: (error) => {
          console.error('Match error:', error);
          toast.error(error);
          setErrorMessage(error);
        }
      });

      // Connect to socket
      await matchService.connect();

      setGameStatus('finding_match');

      // Find a match
      const matchId = await matchService.findMatch(mode, time);
      console.log('Joined match:', matchId);

      // Don't set to waiting_for_opponent here - if we joined an existing match with 2 players,
      // the onGameStart callback will have already set status to 'playing'
      // Only set to waiting if we're still finding_match (created a new match)
      setGameStatus(prev => prev === 'finding_match' ? 'waiting_for_opponent' : prev);

    } catch (error) {
      console.error('Failed to initialize game:', error);
      setErrorMessage('Failed to connect to game server. Please try again.');
      setGameStatus('idle');
      toast.error('Connection failed');
    }
  };

  const handleCellClick = async (index: number) => {
    if (!isMyTurn || board[index] !== '' || !matchServiceRef.current) {
      return;
    }

    try {
      // Send move to server
      await matchServiceRef.current.makeMove(index);
    } catch (error) {
      console.error('Failed to make move:', error);
      toast.error('Failed to make move');
    }
  };

  const handleLeaveMatch = async () => {
    if (matchServiceRef.current) {
      await matchServiceRef.current.leaveMatch();
      matchServiceRef.current.disconnect();
    }
    navigate('/');
  };

  // Timer logic for Timed mode
  const handleTimeout = async () => {
    if (!matchServiceRef.current) return;

    toast.warning('Time expired! Turn skipped');
    // Make a move with position -1 to indicate timeout
    try {
      await matchServiceRef.current.makeMove(-1);
    } catch (error) {
      console.error('Failed to send timeout move:', error);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    if (gameMode !== 'timed' || !isMyTurn || !timeLimit || gameStatus !== 'playing') {
      setTimeRemaining(null);
      return;
    }

    setTimeRemaining(timeLimit);

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Time's up - trigger timeout
          handleTimeout();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, gameMode, timeLimit, gameStatus]);

  const handlePlayAgain = () => {
    // Reset state
    setBoard(Array(9).fill(''));
    setPlayers({});
    setCurrentTurn('');
    setWinner(null);
    setIsDraw(false);
    setGameStatus('idle');
    setShowModeModal(true);

    // Clean up existing connection
    if (matchServiceRef.current) {
      matchServiceRef.current.leaveMatch();
      matchServiceRef.current.disconnect();
      matchServiceRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (matchServiceRef.current) {
        matchServiceRef.current.disconnect();
      }
    };
  }, []);

  if (gameStatus === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black mx-auto"></div>
          <p className="mt-4 text-lg font-semibold">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (gameStatus === 'finding_match') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black mx-auto"></div>
          <p className="mt-4 text-lg font-semibold">Finding match...</p>
          <button
            onClick={handleLeaveMatch}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === 'waiting_for_opponent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-pulse">
            <h2 className="text-2xl font-bold mb-4">Waiting for opponent...</h2>
          </div>
          <p className="text-gray-600 mb-4">You'll be matched with another player soon</p>
          <button
            onClick={handleLeaveMatch}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  if (errorMessage && gameStatus === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <p className="text-red-600 text-lg mb-4">{errorMessage}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 gap-6 bg-white">
      {showModeModal && <ModeSelectionModal onSelect={handleModeSelect} />}

      <h1 className="text-center text-2xl sm:text-3xl font-bold mt-4 text-black">
        Multiplayer Tic-Tac-Toe
      </h1>

      {gameMode === 'timed' && timeLimit && (
        <div className="bg-blue-100 border-2 border-blue-600 rounded-lg px-4 py-2 text-center">
          <p className="text-sm font-semibold text-blue-800">
            ⏱️ Timed Mode: {timeLimit}s per move
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 border-2 border-red-600 rounded-lg px-4 py-2 text-center">
          <p className="text-sm font-semibold text-red-800">{errorMessage}</p>
        </div>
      )}

      {gameStatus === 'playing' || gameStatus === 'finished' ? (
        <>
          <p className="text-center text-base text-black font-semibold">
            {isDraw && 'Game Over: Draw!'}
            {winner && !isDraw && (winner === myUserId ? 'You Won! 🎉' : 'You Lost')}
            {!winner && !isDraw && (isMyTurn ? "Your turn!" : "Opponent's turn...")}
          </p>

          {/* Timer Display for Timed Mode */}
          {gameMode === 'timed' && isMyTurn && timeRemaining !== null && gameStatus === 'playing' && (
            <div className={`text-center mb-4 p-3 rounded-lg border-2 ${timeRemaining <= 5
                ? 'border-red-500 bg-red-50 animate-pulse'
                : 'border-blue-500 bg-blue-50'
              }`}>
              <p className={`text-lg font-bold ${timeRemaining <= 5 ? 'text-red-700' : 'text-blue-700'
                }`}>
                ⏱️ Time Remaining: {timeRemaining}s
              </p>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 md:gap-10 justify-center items-center w-full max-w-4xl">
            {/* My Player Card */}
            <PlayerCard
              avatarUrl={playerAvatars[myUserId]}
              player={myPlayer}
              symbol={mySymbol || 'X'}
              isCurrentTurn={isMyTurn && !winner && !isDraw}
              isYou={true}
              score={playerStats[myUserId]?.score || 0}
              winPercentage={playerStats[myUserId]?.winPercentage || 0}
              winStreak={playerStats[myUserId]?.winStreak || 0}
            />

            {/* Game Board */}
            <div className="bg-white border-2 border-black p-4 rounded-lg shadow-[4px_4px_0px_0px_black]">
              <div className="grid grid-cols-3 gap-0">
                {board.map((cell, index) => {
                  const row = Math.floor(index / 3);
                  const col = index % 3;
                  const isTop = row === 0;
                  const isLeft = col === 0;

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={!isMyTurn || cell !== '' || winner !== null || isDraw}
                      onClick={() => handleCellClick(index)}
                      className={`
                        aspect-square 
                        w-20 sm:w-24 md:w-28 
                        flex justify-center items-center 
                        text-2xl sm:text-3xl font-bold
                        border-black 
                        ${!isTop ? 'border-t-2' : ''}
                        ${!isLeft ? 'border-l-2' : ''}
                        ${cell === '' && isMyTurn && !winner && !isDraw ? 'hover:bg-gray-200 cursor-pointer' : ''}
                        ${cell === 'X' ? 'text-blue-600' : 'text-red-600'}
                        ${!isMyTurn && cell === '' ? 'cursor-not-allowed' : ''}
                        bg-white
                        transition-colors
                      `}
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opponent Card */}
            <PlayerCard
              avatarUrl={opponentId ? playerAvatars[opponentId] : undefined}
              player={opponent}
              symbol={opponent?.symbol || 'O'}
              isCurrentTurn={currentTurn === opponentId && !winner && !isDraw}
              isYou={false}
              score={opponentId ? (playerStats[opponentId]?.score || 0) : 0}
              winPercentage={opponentId ? (playerStats[opponentId]?.winPercentage || 0) : 0}
              winStreak={opponentId ? (playerStats[opponentId]?.winStreak || 0) : 0}
            />
          </div>

          {/* MoveSummary for Timed mode */}
          {gameMode === 'timed' && moves.length > 0 && (
            <MoveSummary moves={moves} gameMode={gameMode} />
          )}


          {/* Action Buttons */}
          <div className="flex gap-4 mt-4">
            {(winner || isDraw) && (
              <button
                onClick={handlePlayAgain}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
              >
                Play Again
              </button>
            )}
            <button
              onClick={handleLeaveMatch}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
            >
              Leave Match
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default MultiplayerGame;
