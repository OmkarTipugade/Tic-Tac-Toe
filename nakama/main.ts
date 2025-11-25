// Nakama Multiplayer Tic-Tac-Toe Backend
// Supports Classic and Timed game modes
// Game state interface

interface GameState {
    board: string[];
    currentTurn: string;
    players: { [userId: string]: PlayerInfo };
    playerSymbols: { [userId: string]: string };
    winner: string | null;
    isDraw: boolean;
    gameStarted: boolean;
    moveCount: number;
    mode: string;
    timeLimit?: number;
}

// Player info interface
interface PlayerInfo {
    userId: string;
    username: string;
    symbol: string;
}

// Initialize the Nakama module
function InitModule(ctx: runtime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    // Register RPC functions
    initializer.registerRpc('create_match', rpcCreateMatch);
    initializer.registerRpc('find_match', rpcFindMatch);

    // Register match handler
    initializer.registerMatch('tictactoe', {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchTerminate,
        matchSignal
    });

    logger.info('Tic-Tac-Toe multiplayer backend loaded!');
    logger.info('Match handler and RPCs registered successfully');
}

// RPC to create a new match
function rpcCreateMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    const matchId = nk.matchCreate('tictactoe', {});
    logger.info('Created new match: ' + matchId);
    return JSON.stringify({ matchId });
}

// RPC to find an available match or create a new one
function rpcFindMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    // Parse the payload to extract mode and timeLimit
    let mode = 'classic';
    let timeLimit: number | undefined = undefined;

    try {
        const params = JSON.parse(payload);
        mode = params.mode || 'classic';
        timeLimit = params.timeLimit;
    } catch (e) {
        logger.warn('Failed to parse payload, using defaults: ' + e);
    }

    logger.info(`Finding match for mode: ${mode}, timeLimit: ${timeLimit}`);

    const limit = 10;
    const matches = nk.matchList(limit, true, '', 0, 2, '*');

    // Find a match with less than 2 players and matching mode/timeLimit
    for (const match of matches) {
        if (match.size < 2) {
            // Try to parse the match label to check mode/timeLimit
            try {
                const label = JSON.parse(match.label || '{}');
                if (label.mode === mode && label.timeLimit === timeLimit) {
                    logger.info('Found available match: ' + match.matchId);
                    return JSON.stringify({ matchId: match.matchId });
                }
            } catch (e) {
                // If label parsing fails, skip this match
                continue;
            }
        }
    }

    // No available match found, create a new one with the specified mode and timeLimit
    const matchParams = { mode, timeLimit };
    const matchId = nk.matchCreate('tictactoe', matchParams);
    logger.info(`Created new match: ${matchId} with mode: ${mode}, timeLimit: ${timeLimit}`);
    return JSON.stringify({ matchId });
}

// Match initialization
function matchInit(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: { [key: string]: any }): { state: GameState, tickRate: number, label: string } {
    logger.info('Match initializing with params: ' + JSON.stringify(params));

    const state: GameState = {
        board: Array(9).fill(''),
        currentTurn: '',
        players: {},
        playerSymbols: {},
        winner: null,
        isDraw: false,
        gameStarted: false,
        moveCount: 0,
        mode: params.mode || 'classic',
        timeLimit: params.timeLimit
    };

    const tickRate = 1; // 1 tick per second

    // Create label with mode and timeLimit for matchmaking
    const label = JSON.stringify({
        mode: params.mode || 'classic',
        timeLimit: params.timeLimit
    });

    return {
        state,
        tickRate,
        label
    };
}

// Check if a player can join the match
function matchJoinAttempt(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: GameState, presence: nkruntime.Presence, metadata: { [key: string]: any }): { state: GameState, accept: boolean, rejectMessage?: string } | null {
    // Only allow 2 players
    const playerCount = Object.keys(state.players).length;
    if (playerCount >= 2) {
        return {
            state,
            accept: false,
            rejectMessage: 'Match is full'
        };
    }

    return {
        state,
        accept: true
    };
}

// Handle player joining the match
function matchJoin(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: GameState, presences: nkruntime.Presence[]): { state: GameState } | null {
    for (const presence of presences) {
        const userId = presence.userId;
        const username = presence.username;

        // Assign symbol (X for first player, O for second)
        const symbol = Object.keys(state.players).length === 0 ? 'X' : 'O';

        const playerInfo: PlayerInfo = {
            userId,
            username,
            symbol
        };

        state.players[userId] = playerInfo;
        state.playerSymbols[userId] = symbol;

        logger.info(`Player ${username} (${userId}) joined as ${symbol}`);

        // Broadcast player joined
        const joinMessage = {
            type: 'player_joined',
            player: playerInfo
        };
        dispatcher.broadcastMessage(0, JSON.stringify(joinMessage));

        // Start game when 2 players have joined
        if (Object.keys(state.players).length === 2) {
            state.gameStarted = true;
            // X always goes first
            const firstPlayer = Object.values(state.players).find(p => p.symbol === 'X');
            state.currentTurn = firstPlayer!.userId;

            logger.info('Game starting! First turn: ' + firstPlayer!.username);

            const startMessage = {
                type: 'game_start',
                players: state.players,
                currentTurn: state.currentTurn,
                mode: state.mode,
                timeLimit: state.timeLimit
            };
            dispatcher.broadcastMessage(0, JSON.stringify(startMessage));
        }
    }

    return { state };
}

// Handle player leaving the match
function matchLeave(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: GameState, presences: nkruntime.Presence[]): { state: GameState } | null {
    for (const presence of presences) {
        logger.info(`Player ${presence.username} left the match`);

        // Notify other players
        const leaveMessage = {
            type: 'player_disconnected',
            userId: presence.userId
        };
        dispatcher.broadcastMessage(0, JSON.stringify(leaveMessage));
    }

    return { state };
}

// Match loop (runs every tick)
function matchLoop(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: GameState, messages: nkruntime.MatchMessage[]): { state: GameState } | null {
    // Process incoming messages
    for (const message of messages) {
        try {
            const decoder = new TextDecoder();
            const dataStr = decoder.decode(message.data);
            const data = JSON.parse(dataStr);

            if (data.type === 'move') {
                // Validate it's the player's turn
                if (message.sender.userId !== state.currentTurn) {
                    logger.warn(`Player ${message.sender.username} tried to move out of turn`);
                    continue;
                }

                const position = data.position;
                if (position < 0 || position > 8) {
                    logger.warn('Invalid position: ' + position);
                    continue;
                }

                // Check if cell is already occupied
                if (state.board[position] !== '') {
                    logger.warn('Cell already occupied: ' + position);
                    continue;
                }

                // Make the move
                const symbol = state.playerSymbols[message.sender.userId];
                state.board[position] = symbol;
                state.moveCount++;

                logger.info(`Player ${message.sender.username} placed ${symbol} at position ${position}`);

                // Check for winner
                const winner = checkWinner(state.board);
                if (winner) {
                    state.winner = message.sender.userId;
                    const gameOverMessage = {
                        type: 'game_over',
                        winner: state.winner,
                        board: state.board,
                        isDraw: false
                    };
                    dispatcher.broadcastMessage(0, JSON.stringify(gameOverMessage));
                    logger.info(`Game over! Winner: ${message.sender.username}`);
                    return { state };
                }

                // Check for draw
                if (state.moveCount === 9) {
                    state.isDraw = true;
                    const gameOverMessage = {
                        type: 'game_over',
                        board: state.board,
                        isDraw: true
                    };
                    dispatcher.broadcastMessage(0, JSON.stringify(gameOverMessage));
                    logger.info('Game over! Draw');
                    return { state };
                }

                // Switch turns
                const playerIds = Object.keys(state.players);
                const nextPlayerId = playerIds.find(id => id !== state.currentTurn);
                state.currentTurn = nextPlayerId!;

                // Broadcast the move
                const moveMessage = {
                    type: 'move_made',
                    position,
                    symbol,
                    board: state.board,
                    currentTurn: state.currentTurn
                };
                dispatcher.broadcastMessage(0, JSON.stringify(moveMessage));
            }
        } catch (error) {
            logger.error('Error processing message: ' + error);
        }
    }

    return { state };
}

// Check for a winner
function checkWinner(board: string[]): boolean {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]              // Diagonals
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return true;
        }
    }

    return false;
}

// Handle match termination
function matchTerminate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: GameState, graceSeconds: number): { state: GameState } | null {
    logger.info('Match terminating...');
    return { state };
}

// Handle match signals
function matchSignal(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: GameState, data: string): { state: GameState, data?: string } | null {
    logger.info('Match signal received: ' + data);
    return { state };
}
// Nakama Multiplayer Tic-Tac-Toe Backend
// Supports Classic and Timed game modes

// RPC to create a new match
function rpcCreateMatch(ctx, logger, nk, payload) {
    const matchId = nk.matchCreate('tictactoe', {});
    logger.info('Created new match: ' + matchId);
    return JSON.stringify({ matchId: matchId });
}

// RPC to find an available match or create a new one
function rpcFindMatch(ctx, logger, nk, payload) {
    // Parse the payload to extract mode and timeLimit
    let mode = 'classic';
    let timeLimit = undefined;

    try {
        const params = JSON.parse(payload);
        mode = params.mode || 'classic';
        timeLimit = params.timeLimit;
    } catch (e) {
        logger.warn('Failed to parse payload, using defaults: ' + e);
    }

    logger.info('Finding match for mode: ' + mode + ', timeLimit: ' + timeLimit);

    const limit = 10;
    const matches = nk.matchList(limit, true, '', 0, 2, '*');

    // Find a match with less than 2 players and matching mode/timeLimit
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (match.size < 2) {
            // Try to parse the match label to check mode/timeLimit
            try {
                const label = JSON.parse(match.label || '{}');
                if (label.mode === mode && label.timeLimit === timeLimit) {
                    logger.info('Found available match: ' + match.matchId);
                    return JSON.stringify({ matchId: match.matchId });
                }
            } catch (e) {
                // If label parsing fails, skip this match
                continue;
            }
        }
    }

    // No available match found, create a new one with the specified mode and timeLimit
    const matchParams = { mode: mode, timeLimit: timeLimit };
    const matchId = nk.matchCreate('tictactoe', matchParams);
    logger.info('Created new match: ' + matchId + ' with mode: ' + mode + ', timeLimit: ' + timeLimit);
    return JSON.stringify({ matchId: matchId });
}

// Match initialization
function matchInit(ctx, logger, nk, params) {
    logger.info('Match initializing with params: ' + JSON.stringify(params));

    const state = {
        board: ['', '', '', '', '', '', '', '', ''],
        currentTurn: '',
        players: {},
        playerSymbols: {},
        winner: null,
        isDraw: false,
        gameStarted: false,
        moveCount: 0,
        mode: params.mode || 'classic',
        timeLimit: params.timeLimit
    };

    const tickRate = 1; // 1 tick per second

    // Create label with mode and timeLimit for matchmaking
    const label = JSON.stringify({
        mode: params.mode || 'classic',
        timeLimit: params.timeLimit
    });

    return {
        state: state,
        tickRate: tickRate,
        label: label
    };
}

// Check if a player can join the match
function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    // Only allow 2 players
    const playerCount = Object.keys(state.players).length;
    if (playerCount >= 2) {
        return {
            state: state,
            accept: false,
            rejectMessage: 'Match is full'
        };
    }

    return {
        state: state,
        accept: true
    };
}

// Handle player joining the match
function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
    for (let i = 0; i < presences.length; i++) {
        const presence = presences[i];
        const userId = presence.userId;
        const username = presence.username;

        // Assign symbol (X for first player, O for second)
        const symbol = Object.keys(state.players).length === 0 ? 'X' : 'O';

        const playerInfo = {
            userId: userId,
            username: username,
            symbol: symbol
        };

        state.players[userId] = playerInfo;
        state.playerSymbols[userId] = symbol;

        logger.info('Player ' + username + ' (' + userId + ') joined as ' + symbol);

        // Broadcast player joined
        const joinMessage = {
            type: 'player_joined',
            player: playerInfo
        };
        dispatcher.broadcastMessage(0, JSON.stringify(joinMessage));

        // Start game when 2 players have joined
        if (Object.keys(state.players).length === 2) {
            state.gameStarted = true;
            // X always goes first
            let firstPlayer = null;
            for (let key in state.players) {
                if (state.players[key].symbol === 'X') {
                    firstPlayer = state.players[key];
                    break;
                }
            }
            state.currentTurn = firstPlayer.userId;

            logger.info('Game starting! First turn: ' + firstPlayer.username);

            const startMessage = {
                type: 'game_start',
                players: state.players,
                currentTurn: state.currentTurn,
                mode: state.mode,
                timeLimit: state.timeLimit
            };
            dispatcher.broadcastMessage(0, JSON.stringify(startMessage));
        }
    }

    return { state: state };
}

// Handle player leaving the match
function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
    for (let i = 0; i < presences.length; i++) {
        const presence = presences[i];
        logger.info('Player ' + presence.username + ' left the match');

        // Notify other players
        const leaveMessage = {
            type: 'player_disconnected',
            userId: presence.userId
        };
        dispatcher.broadcastMessage(0, JSON.stringify(leaveMessage));
    }

    return { state: state };
}

function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
    // Process incoming messages
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        try {
            const dataStr = nk.binaryToString(message.data);
            const data = JSON.parse(dataStr);

            if (data.type === 'move') {
                // Validate it's the player's turn
                if (message.sender.userId !== state.currentTurn) {
                    logger.warn('Player ' + message.sender.username + ' tried to move out of turn');
                    continue;
                }

                const position = data.position;
                if (position < 0 || position > 8) {
                    logger.warn('Invalid position: ' + position);
                    continue;
                }

                // Check if cell is already occupied
                if (state.board[position] !== '') {
                    logger.warn('Cell already occupied: ' + position);
                    continue;
                }

                // Make the move
                const symbol = state.playerSymbols[message.sender.userId];
                state.board[position] = symbol;
                state.moveCount++;

                logger.info('Player ' + message.sender.username + ' placed ' + symbol + ' at position ' + position);

                // Check for winner
                const winner = checkWinner(state.board);
                if (winner) {
                    state.winner = message.sender.userId;
                    const gameOverMessage = {
                        type: 'game_over',
                        winner: state.winner,
                        board: state.board,
                        isDraw: false
                    };
                    dispatcher.broadcastMessage(0, JSON.stringify(gameOverMessage));
                    logger.info('Game over! Winner: ' + message.sender.username);
                    return { state: state };
                }

                // Check for draw
                if (state.moveCount === 9) {
                    state.isDraw = true;
                    const gameOverMessage = {
                        type: 'game_over',
                        board: state.board,
                        isDraw: true
                    };
                    dispatcher.broadcastMessage(0, JSON.stringify(gameOverMessage));
                    logger.info('Game over! Draw');
                    return { state: state };
                }

                // Switch turns
                let nextPlayerId = null;
                for (let key in state.players) {
                    if (key !== state.currentTurn) {
                        nextPlayerId = key;
                        break;
                    }
                }
                state.currentTurn = nextPlayerId;

                // Broadcast the move
                const moveMessage = {
                    type: 'move_made',
                    position: position,
                    symbol: symbol,
                    board: state.board,
                    currentTurn: state.currentTurn
                };
                dispatcher.broadcastMessage(0, JSON.stringify(moveMessage));
            }
        } catch (error) {
            logger.error('Error processing message: ' + error);
        }
    }

    return { state: state };
}

// Check for a winner
function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]              // Diagonals
    ];

    for (let i = 0; i < winPatterns.length; i++) {
        const pattern = winPatterns[i];
        const a = pattern[0];
        const b = pattern[1];
        const c = pattern[2];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return true;
        }
    }

    return false;
}

// Handle match termination
function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    logger.info('Match terminating...');
    return { state: state };
}

// Handle match signals
function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
    logger.info('Match signal received: ' + data);
    return { state: state };
}

// Initialize the Nakama module - MUST BE LAST
function InitModule(ctx, logger, nk, initializer) {
    // Register RPC functions
    initializer.registerRpc('create_match', rpcCreateMatch);
    initializer.registerRpc('find_match', rpcFindMatch);

    // Register match handler
    initializer.registerMatch('tictactoe', {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });

    logger.info('Tic-Tac-Toe multiplayer backend loaded!');
    logger.info('Match handler and RPCs registered successfully');
}