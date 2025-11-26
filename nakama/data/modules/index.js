
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
                // For Classic mode, normalize undefined/null to null for reliable matching
                const searchTime = (mode === 'classic') ? null : timeLimit;
                const labelTime = (label.mode === 'classic') ? null : label.timeLimit;
                if (label.mode === mode && labelTime === searchTime) {
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

// RPC to get user account information
function rpcGetUserAccount(ctx, logger, nk, payload) {
    try {
        const userId = ctx.userId;

        if (!userId) {
            logger.error('Get account failed: User not authenticated');
            return JSON.stringify({
                success: false,
                error: 'User not authenticated'
            });
        }

        logger.info('Getting account for user: ' + userId);

        const account = nk.accountGetId(userId);

        if (!account || !account.user) {
            logger.error('Failed to retrieve account');
            return JSON.stringify({
                success: false,
                error: 'Failed to retrieve account'
            });
        }

        return JSON.stringify({
            success: true,
            account: {
                user: {
                    id: userId,
                    username: account.user.username || '',
                    display_name: account.user.displayName || '',
                    avatar_url: account.user.avatarUrl || '',
                    location: account.user.location || '',
                    email: account.email || ''
                }
            }
        });
    } catch (e) {
        logger.error('Failed to get account: ' + e);
        return JSON.stringify({
            success: false,
            error: String(e)
        });
    }
}

// RPC to update user profile
function rpcUpdateUserProfile(ctx, logger, nk, payload) {
    try {
        const userId = ctx.userId;

        if (!userId) {
            logger.error('Update profile failed: User not authenticated');
            return JSON.stringify({
                success: false,
                error: 'User not authenticated'
            });
        }

        const params = JSON.parse(payload);
        const username = params.username;
        const display_name = params.display_name;
        const location = params.location;
        const avatar_url = params.avatar_url;

        logger.info('Updating profile for user: ' + userId + ', params: ' + JSON.stringify(params));
        logger.info('Setting avatar_url: ' + (avatar_url || 'undefined') + ', location: ' + (location || 'undefined'));

        // Update player account
        // Correct parameter order: userId, username, displayName, timezone, location, langTag, avatarUrl, metadata
        nk.accountUpdateId(
            userId,
            username || undefined,       // username
            display_name || undefined,   // displayName
            undefined,                   // timezone
            location || undefined,       // location
            undefined,                   // langTag
            avatar_url || undefined,     // avatarUrl
            undefined                    // metadata
        );

        // Fetch updated data
        const account = nk.accountGetId(userId);

        if (!account || !account.user) {
            logger.error('Failed to retrieve updated account');
            return JSON.stringify({
                success: false,
                error: 'Failed to retrieve updated account'
            });
        }

        logger.info('After update - avatarUrl: ' + (account.user.avatarUrl || 'empty') + ', location: ' + (account.user.location || 'empty'));
        logger.info('Profile updated successfully for user: ' + userId);

        return JSON.stringify({
            success: true,
            account: {
                user: {
                    id: userId,
                    username: account.user.username || '',
                    display_name: account.user.displayName || '',
                    avatar_url: account.user.avatarUrl || '',
                    location: account.user.location || '',
                    email: account.email || ''
                }
            }
        });

    } catch (e) {
        logger.error('Failed to update profile: ' + e);
        return JSON.stringify({
            success: false,
            error: String(e)
        });
    }
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

// Match loop (runs every tick)
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
                    // Return null to terminate the match
                    return null;
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
                    // Return null to terminate the match
                    return null;
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
    initializer.registerRpc('get_user_account', rpcGetUserAccount);
    initializer.registerRpc('update_user_profile', rpcUpdateUserProfile);

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
