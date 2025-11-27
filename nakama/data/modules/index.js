
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
    // Search for matches with 0-2 players (includes newly created matches)
    const matches = nk.matchList(limit, true, '', 0, 2, '*');

    logger.info('Found ' + matches.length + ' total matches');

    // Find a match with less than 2 players and matching mode/timeLimit
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        logger.info('Checking match ' + i + ': ID=' + match.matchId + ', size=' + match.size + ', label=' + match.label);

        if (match.size >= 2) {
            logger.info('  ⏭️  Skipping: match is full (size=' + match.size + ')');
            continue;
        }

        // Try to parse the match label to check mode/timeLimit
        try {
            const label = JSON.parse(match.label || '{}');
            logger.info('  Label parsed: mode=' + label.mode + ', timeLimit=' + label.timeLimit);

            // For Classic mode, normalize undefined/null to null for reliable matching
            const searchTime = (mode === 'classic') ? null : timeLimit;
            const labelTime = (label.mode === 'classic') ? null : label.timeLimit;

            logger.info('  Comparing: searchMode=' + mode + ' vs labelMode=' + label.mode + ', searchTime=' + searchTime + ' vs labelTime=' + labelTime);

            if (label.mode === mode && labelTime === searchTime) {
                logger.info('✅ MATCH FOUND! Returning existing match: ' + match.matchId + ' (size=' + match.size + ')');
                return JSON.stringify({ matchId: match.matchId });
            } else {
                logger.info('  ❌ No match: mode or time mismatch');
            }
        } catch (e) {
            // If label parsing fails, skip this match
            logger.warn('  Label parsing failed: ' + e);
            continue;
        }
    }

    // No match found - wait briefly and retry to catch race conditions
    // (Player 1 might have created a match but not joined yet)
    logger.info('⏳ No match found, waiting 150ms and retrying...');

    var startTime = Date.now();
    while (Date.now() - startTime < 150) {
        // Busy wait for 150ms
    }

    // Retry search
    const retryMatches = nk.matchList(limit, true, '', 0, 2, '*');
    logger.info('🔄 Retry found ' + retryMatches.length + ' matches');

    for (let i = 0; i < retryMatches.length; i++) {
        const match = retryMatches[i];
        logger.info('Retry checking match ' + i + ': ID=' + match.matchId + ', size=' + match.size);

        if (match.size >= 2) {
            continue;
        }

        try {
            const label = JSON.parse(match.label || '{}');
            const searchTime = (mode === 'classic') ? null : timeLimit;
            const labelTime = (label.mode === 'classic') ? null : label.timeLimit;

            if (label.mode === mode && labelTime === searchTime) {
                logger.info('✅ MATCH FOUND on retry: ' + match.matchId + ' (size=' + match.size + ')');
                return JSON.stringify({ matchId: match.matchId });
            }
        } catch (e) {
            continue;
        }
    }

    // Still no match - create a new one
    logger.info('No suitable match found after retry, creating new match');
    const matchParams = { mode: mode, timeLimit: timeLimit };
    const matchId = nk.matchCreate('tictactoe', matchParams);
    logger.info('✨ Created new match: ' + matchId + ' with mode: ' + mode + ', timeLimit: ' + timeLimit);
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

// RPC to get user account by ID (for fetching other players' info)
function rpcGetUserAccountById(ctx, logger, nk, payload) {
    try {
        const params = JSON.parse(payload);
        const targetUserId = params.userId;

        if (!targetUserId) {
            logger.error('Get account by ID failed: No userId provided');
            return JSON.stringify({
                success: false,
                error: 'No userId provided'
            });
        }

        logger.info('Getting account for user: ' + targetUserId);

        const account = nk.accountGetId(targetUserId);

        if (!account || !account.user) {
            logger.error('Failed to retrieve account for user: ' + targetUserId);
            return JSON.stringify({
                success: false,
                error: 'Failed to retrieve account'
            });
        }

        return JSON.stringify({
            success: true,
            account: {
                user: {
                    id: targetUserId,
                    username: account.user.username || '',
                    display_name: account.user.displayName || '',
                    avatar_url: account.user.avatarUrl || '',
                    location: account.user.location || '',
                    email: account.email || ''
                }
            }
        });
    } catch (e) {
        logger.error('Failed to get account by ID: ' + e);
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

// RPC to get player stats
function rpcGetPlayerStats(ctx, logger, nk, payload) {
    try {
        const userId = ctx.userId;

        if (!userId) {
            logger.error('Get player stats failed: User not authenticated');
            return JSON.stringify({
                success: false,
                error: 'User not authenticated'
            });
        }

        // Read player stats from storage
        const objectIds = [{
            collection: 'player_stats',
            key: 'stats',
            userId: userId
        }];

        const objects = nk.storageRead(objectIds);

        let stats = {
            score: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winStreak: 0
        };

        if (objects.length > 0 && objects[0].value) {
            // Value is stored as object, not string
            stats = objects[0].value;
        }

        logger.info('Retrieved stats for user ' + userId + ': ' + JSON.stringify(stats));

        return JSON.stringify({
            success: true,
            stats: stats
        });

    } catch (e) {
        logger.error('Failed to get player stats: ' + e);
        return JSON.stringify({
            success: false,
            error: String(e)
        });
    }
}

// RPC to get player stats by ID (for fetching other players' stats)
function rpcGetPlayerStatsById(ctx, logger, nk, payload) {
    try {
        const params = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const targetUserId = params.userId;

        if (!targetUserId) {
            logger.error('Get player stats by ID failed: No userId provided');
            return JSON.stringify({
                success: false,
                error: 'No userId provided'
            });
        }

        logger.info('Getting stats for user: ' + targetUserId);

        // Read player stats from storage
        const objectIds = [{
            collection: 'player_stats',
            key: 'stats',
            userId: targetUserId
        }];

        const objects = nk.storageRead(objectIds);

        let stats = {
            score: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winStreak: 0
        };

        if (objects.length > 0 && objects[0].value) {
            // Value is stored as object, not string
            stats = objects[0].value;
        }

        logger.info('Retrieved stats for user ' + targetUserId + ': ' + JSON.stringify(stats));

        return JSON.stringify({
            success: true,
            stats: stats
        });

    } catch (e) {
        logger.error('Failed to get player stats by ID: ' + e);
        return JSON.stringify({
            success: false,
            error: String(e)
        });
    }
}

// RPC to update player stats after game
function rpcUpdatePlayerStats(ctx, logger, nk, payload) {
    try {
        const userId = ctx.userId;

        if (!userId) {
            logger.error('Update player stats failed: User not authenticated');
            return JSON.stringify({
                success: false,
                error: 'User not authenticated'
            });
        }

        // Parse payload - it might already be an object or a string
        let params;
        if (typeof payload === 'string') {
            params = JSON.parse(payload);
        } else {
            params = payload;
        }

        const isWin = params.isWin || false;
        const isDraw = params.isDraw || false;

        // Read current stats
        const objectIds = [{
            collection: 'player_stats',
            key: 'stats',
            userId: userId
        }];

        const objects = nk.storageRead(objectIds);

        let stats = {
            score: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winStreak: 0
        };

        if (objects.length > 0 && objects[0].value) {
            // Value is stored as object, not string
            stats = objects[0].value;
        }

        // Update stats based on result
        if (isWin) {
            stats.score += 15;
            stats.wins += 1;
            stats.winStreak += 1;
        } else if (isDraw) {
            stats.score += 7;
            stats.draws += 1;
            stats.winStreak = 0;
        } else {
            // Loss
            stats.score -= 15;
            stats.losses += 1;
            stats.winStreak = 0;
        }

        // Ensure score doesn't go below 0
        if (stats.score < 0) {
            stats.score = 0;
        }

        // Write updated stats
        const writeOps = [{
            collection: 'player_stats',
            key: 'stats',
            userId: userId,
            value: stats,
            permissionRead: 1,
            permissionWrite: 0
        }];
        nk.storageWrite(writeOps);

        logger.info('Player stats updated for ' + userId + ': ' + JSON.stringify(stats));

        // Update leaderboard with new score
        try {
            nk.leaderboardRecordWrite('global_leaderboard', userId, ctx.username || 'Player', stats.score, 0);
            logger.info('Leaderboard updated for ' + userId + ' with score ' + stats.score);
        } catch (e) {
            logger.warn('Failed to update leaderboard: ' + e);
        }

        return JSON.stringify({
            success: true,
            stats: stats
        });
    } catch (e) {
        logger.error('Failed to update player stats: ' + e);
        return JSON.stringify({
            success: false,
            error: String(e)
        });
    }
}

// RPC to get leaderboard - all players sorted by score
function rpcGetLeaderboard(ctx, logger, nk, payload) {
    try {
        // Parse limit from payload (default 50)
        let limit = 50;
        try {
            const params = JSON.parse(payload);
            if (params.limit && params.limit > 0) {
                limit = Math.min(params.limit, 100); // Cap at 100
            }
        } catch (e) {
            // Use default
        }

        logger.info('Fetching leaderboard, limit: ' + limit);

        // List all player stats from storage
        const objectList = nk.storageList('', 'player_stats', limit + 100, ''); // Get extra to filter

        if (!objectList || objectList.objects.length === 0) {
            logger.info('No player stats found');
            return JSON.stringify({
                success: true,
                leaderboard: []
            });
        }

        // Build leaderboard array
        const players = [];
        for (let i = 0; i < objectList.objects.length; i++) {
            const obj = objectList.objects[i];
            try {
                const stats = obj.value;
                const userId = obj.userId;

                // Get user account for username
                let username = 'Player';
                try {
                    const account = nk.accountGetId(userId);
                    username = account.user.username || account.user.displayName || 'Player';
                } catch (e) {
                    logger.warn('Could not fetch username for ' + userId);
                }

                // Calculate win rate
                const totalGames = (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0);
                const winRate = totalGames > 0 ? ((stats.wins || 0) / totalGames * 100).toFixed(1) : 0;

                players.push({
                    userId: userId,
                    username: username,
                    score: stats.score || 0,
                    wins: stats.wins || 0,
                    losses: stats.losses || 0,
                    draws: stats.draws || 0,
                    winStreak: stats.winStreak || 0,
                    winRate: parseFloat(winRate)
                });
            } catch (e) {
                logger.warn('Error processing player stats: ' + e);
                continue;
            }
        }

        // Sort by score (descending)
        players.sort(function (a, b) {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // Tie-breaker: higher win rate
            return b.winRate - a.winRate;
        });

        // Limit results
        const leaderboard = players.slice(0, limit);

        logger.info('Leaderboard generated with ' + leaderboard.length + ' entries');

        return JSON.stringify({
            success: true,
            leaderboard: leaderboard
        });

    } catch (e) {
        logger.error('Failed to get leaderboard: ' + e);
        return JSON.stringify({
            success: false,
            error: String(e)
        });
    }
}

// Helper function to update player stats for forfeit
function updatePlayerStatsForForfeit(nk, logger, userId, isWinner) {
    try {
        // Read current stats
        const objectIds = [{
            collection: 'player_stats',
            key: 'stats',
            userId: userId
        }];

        const objects = nk.storageRead(objectIds);

        let stats = {
            score: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winStreak: 0
        };

        if (objects.length > 0 && objects[0].value) {
            stats = objects[0].value;
        }

        // Update stats based on result
        if (isWinner) {
            stats.score += 15;
            stats.wins += 1;
            stats.winStreak += 1;
            logger.info('Updating winner stats for ' + userId + ': +15 points, +1 win');
        } else {
            stats.score -= 15;
            stats.losses += 1;
            stats.winStreak = 0;
            logger.info('Updating loser stats for ' + userId + ': -15 points, +1 loss');
        }

        // Ensure score doesn't go below 0
        if (stats.score < 0) {
            stats.score = 0;
        }

        // Write updated stats
        const writeOps = [{
            collection: 'player_stats',
            key: 'stats',
            userId: userId,
            value: stats,
            permissionRead: 1,
            permissionWrite: 0
        }];
        nk.storageWrite(writeOps);

        logger.info('Forfeit stats updated for ' + userId + ', isWinner: ' + isWinner + ', new stats: ' + JSON.stringify(stats));

        // Update leaderboard
        try {
            // Get username for leaderboard
            var username = 'Player';
            try {
                var account = nk.accountGetId(userId);
                username = account.user.username || account.user.displayName || 'Player';
            } catch (e) {
                // Use default
            }
            nk.leaderboardRecordWrite('global_leaderboard', userId, username, stats.score, 0);
            logger.info('Leaderboard updated after forfeit for ' + userId);
        } catch (e) {
            logger.warn('Failed to update leaderboard after forfeit: ' + e);
        }

    } catch (error) {
        logger.error('Error updating stats for forfeit: ' + error);
        throw error;
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
        timeLimit: params.timeLimit,
        lastMoveTime: null  // Track time of last move for accurate timing
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
            state.lastMoveTime = Date.now(); // Start timer when game begins

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
        const userId = presence.userId;
        logger.info('Player ' + presence.username + ' (' + userId + ') left the match');

        // Check if game is in progress
        if (state.gameStarted && !state.winner && !state.isDraw) {
            logger.info('Player left mid-game, awarding win to remaining player');

            // Find the remaining player
            let remainingPlayerId = null;
            for (let key in state.players) {
                if (key !== userId) {
                    remainingPlayerId = key;
                    break;
                }
            }

            if (remainingPlayerId) {
                // Update stats for both players
                try {
                    // Winner gets +15 points, +1 win
                    updatePlayerStatsForForfeit(nk, logger, remainingPlayerId, true);
                    // Loser gets -15 points, +1 loss
                    updatePlayerStatsForForfeit(nk, logger, userId, false);
                    logger.info('Stats updated for forfeit: Winner=' + remainingPlayerId + ', Loser=' + userId);
                } catch (error) {
                    logger.error('Failed to update stats for forfeit: ' + error);
                }

                // Award win to remaining player
                state.winner = remainingPlayerId;
                const gameOverMessage = {
                    type: 'game_over',
                    winner: remainingPlayerId,
                    board: state.board,
                    isDraw: false,
                    reason: 'forfeit'
                };
                dispatcher.broadcastMessage(0, JSON.stringify(gameOverMessage));
                logger.info('Match ended due to forfeit. Winner: ' + state.players[remainingPlayerId].username);

                // Terminate the match
                return null;
            }
        }

        // Notify other players about disconnection
        const leaveMessage = {
            type: 'player_disconnected',
            userId: userId
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

                // Handle timeout (position === -1)
                if (position === -1) {
                    logger.info('Player ' + message.sender.username + ' timed out');

                    // Reset move timer
                    state.lastMoveTime = Date.now();

                    // Switch to other player
                    let nextPlayerId = null;
                    for (let key in state.players) {
                        if (key !== state.currentTurn) {
                            nextPlayerId = key;
                            break;
                        }
                    }
                    state.currentTurn = nextPlayerId;

                    // Broadcast turn switch
                    const turnSwitchMessage = {
                        type: 'move_made',
                        position: -1,  // Indicate timeout
                        symbol: '',
                        board: state.board,
                        currentTurn: nextPlayerId,
                        timeTaken: 0
                    };
                    dispatcher.broadcastMessage(0, JSON.stringify(turnSwitchMessage));
                    logger.info('Turn switched to ' + state.players[nextPlayerId].username + ' due to timeout');
                    continue;  // Skip rest of move processing
                }

                // Validate position
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

                // Calculate time taken for this move
                const currentTime = Date.now();
                let timeTaken = 0;
                if (state.lastMoveTime !== null) {
                    timeTaken = (currentTime - state.lastMoveTime) / 1000;  // Convert to seconds
                }
                state.lastMoveTime = currentTime;  // Update for next move

                logger.info('Player ' + message.sender.username + ' placed ' + symbol + ' at position ' + position + ', time taken: ' + timeTaken.toFixed(2) + 's');

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

                // Broadcast the move with time taken
                const moveMessage = {
                    type: 'move_made',
                    position: position,
                    symbol: symbol,
                    board: state.board,
                    currentTurn: state.currentTurn,
                    timeTaken: timeTaken  // Include server-calculated time
                };
                dispatcher.broadcastMessage(0, JSON.stringify(moveMessage));
            } else if (data.type === 'forfeit') {
                // Handle forfeit - player is giving up
                logger.info('Player ' + message.sender.username + ' forfeited');

                // Find the opponent
                let opponentId = null;
                for (let key in state.players) {
                    if (key !== message.sender.userId) {
                        opponentId = key;
                        break;
                    }
                }

                if (opponentId) {
                    // Update stats for both players
                    try {
                        // Winner gets +15 points, +1 win
                        updatePlayerStatsForForfeit(nk, logger, opponentId, true);
                        // Loser gets -15 points, +1 loss
                        updatePlayerStatsForForfeit(nk, logger, message.sender.userId, false);
                        logger.info('Stats updated for forfeit: Winner=' + opponentId + ', Loser=' + message.sender.userId);
                    } catch (error) {
                        logger.error('Failed to update stats for forfeit: ' + error);
                    }

                    // Award win to opponent
                    state.winner = opponentId;
                    const gameOverMessage = {
                        type: 'game_over',
                        winner: opponentId,
                        board: state.board,
                        isDraw: false,
                        reason: 'forfeit'
                    };
                    dispatcher.broadcastMessage(0, JSON.stringify(gameOverMessage));
                    logger.info('Match ended due to forfeit. Winner: ' + state.players[opponentId].username);

                    // Terminate the match
                    return null;
                }
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
    logger.info('Initializing Tic-Tac-Toe module...');

    // Create global leaderboard
    try {
        const leaderboardId = 'global_leaderboard';
        const authoritative = false; // Players can submit scores
        const sortOrder = 'desc'; // Descending order (highest first)
        const operator = 'best'; // Keep the best score
        const resetSchedule = null; // Never reset
        const metadata = {
            name: 'Global Leaderboard',
            description: 'Top Tic-Tac-Toe players worldwide'
        };

        nk.leaderboardCreate(leaderboardId, authoritative, sortOrder, operator, resetSchedule, metadata);
        logger.info('✅ Global leaderboard created: ' + leaderboardId);
    } catch (e) {
        // Leaderboard might already exist, that's fine
        logger.info('Leaderboard already exists or creation skipped: ' + e);
    }

    // Register RPC functions
    initializer.registerRpc('create_match', rpcCreateMatch);
    initializer.registerRpc('find_match', rpcFindMatch);
    initializer.registerRpc('get_user_account', rpcGetUserAccount);
    initializer.registerRpc('get_user_account_by_id', rpcGetUserAccountById);
    initializer.registerRpc('update_user_profile', rpcUpdateUserProfile);
    initializer.registerRpc('get_player_stats', rpcGetPlayerStats);
    initializer.registerRpc('get_player_stats_by_id', rpcGetPlayerStatsById);
    initializer.registerRpc('update_player_stats', rpcUpdatePlayerStats);
    initializer.registerRpc('get_leaderboard', rpcGetLeaderboard);

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
