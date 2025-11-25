import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import PlayerCard from '../components/PlayerCard';
import ModeSelectionModal from '../components/ModeSelectionModal';
import { nkClient } from '../services/nakama-client';
import { NakamaMatchService } from '../services/nakama-match';
import type { MatchPlayer } from '../types/types';
import { useAuth } from '../context/AuthContext';
import type { Session } from '@heroiclabs/nakama-js';

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

      // Get session from localStorage
      const sessionData = localStorage.getItem('user_session');
      if (!sessionData) {
        setErrorMessage('No active session. Please sign in again.');
        toast.error('Session expired. Please sign in again.');
        navigate('/sign-in');
        return;
      }

      const session = JSON.parse(sessionData) as Session;

      // Restore the session
      const restoredSession = await nkClient.sessionRefresh(session);
      localStorage.setItem('user_session', JSON.stringify(restoredSession));

      if (!restoredSession.user_id) {
        throw new Error('Failed to get user ID from session');
      }
      setMyUserId(restoredSession.user_id);

      // Create match service
      const matchService = new NakamaMatchService(nkClient, restoredSession);
      matchServiceRef.current = matchService;

      // Set up callbacks for real-time updates
      matchService.setCallbacks({
        onPlayerJoined: (player) => {
          console.log('Player joined:', player);
          setPlayers(prev => ({
            ...prev,
            [player.userId]: player
          }));
        },
        onGameStart: (data) => {
          console.log('Game started:', data);
          setPlayers(data.players);
          setCurrentTurn(data.currentTurn);
          setGameStatus('playing');
          toast.success('Game started! Good luck!');
        },
        onMoveMade: (data) => {
          console.log('Move made:', data);
          setBoard(data.board);
          setCurrentTurn(data.currentTurn);
        },
        onGameOver: (data) => {
          console.log('Game over:', data);
          setBoard(data.board);
          setWinner(data.winner || null);
          setIsDraw(data.isDraw);
          setGameStatus('finished');

          if (data.isDraw) {
            toast.info("It's a draw!");
          } else if (data.winner === myUserId) {
            toast.success('You won! 🎉');
          } else {
            toast.info('You lost. Better luck next time!');
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

      setGameStatus('waiting_for_opponent');

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

          <div className="flex flex-col md:flex-row gap-6 md:gap-10 justify-center items-center w-full max-w-4xl">
            {/* My Player Card */}
            <PlayerCard
              avatarUrl=""
              player={myPlayer}
              symbol={mySymbol || 'X'}
              isCurrentTurn={isMyTurn && !winner && !isDraw}
              isYou={true}
              score={0}
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
              avatarUrl=""
              player={opponent}
              symbol={opponent?.symbol || 'O'}
              isCurrentTurn={currentTurn === opponentId && !winner && !isDraw}
              isYou={false}
              score={0}
            />
          </div>

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
