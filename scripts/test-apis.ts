import { Client, Session } from "@heroiclabs/nakama-js";

const SERVER_KEY = "defaultkey";
const HOST = "127.0.0.1";
const PORT = "7350";
const USE_SSL = false;

const client = new Client(SERVER_KEY, HOST, PORT, USE_SSL);

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
    log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
    log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
    log(`ℹ ${message}`, colors.blue);
}

function logSection(message: string) {
    log(`\n${"=".repeat(60)}`, colors.cyan);
    log(message, colors.cyan);
    log("=".repeat(60), colors.cyan);
}

async function testAuthentication(): Promise<Session | null> {
    logSection("Testing Authentication");

    try {
        const deviceId = `test-device-${Date.now()}`;
        logInfo(`Authenticating with device ID: ${deviceId}`);

        const session = await client.authenticateDevice(deviceId, true, `TestUser${Date.now()}`);

        logSuccess("Authentication successful");
        logInfo(`User ID: ${session.user_id}`);
        logInfo(`Username: ${session.username}`);
        logInfo(`Token: ${session.token.substring(0, 20)}...`);

        return session;
    } catch (error: any) {
        logError(`Authentication failed: ${error.message}`);
        return null;
    }
}

async function testGetUserAccount(session: Session) {
    logSection("Testing get_user_account RPC");

    try {
        logInfo("Calling get_user_account...");

        const response = await client.rpc(session, "get_user_account", {});
        const result = JSON.parse(
            typeof response.payload === "string"
                ? response.payload
                : JSON.stringify(response.payload)
        );

        if (result.success) {
            logSuccess("get_user_account successful");
            logInfo(`Account data: ${JSON.stringify(result.account, null, 2)}`);
        } else {
            logError(`get_user_account failed: ${result.error}`);
        }

        return result.success;
    } catch (error: any) {
        logError(`get_user_account error: ${error.message}`);
        return false;
    }
}

async function testUpdateUserProfile(session: Session) {
    logSection("Testing update_user_profile RPC");

    try {
        const newUsername = `UpdatedUser${Date.now()}`;
        const newAvatarUrl = "https://example.com/avatar.png";

        logInfo(`Updating profile with username: ${newUsername}`);
        logInfo(`Avatar URL: ${newAvatarUrl}`);

        const response = await client.rpc(session, "update_user_profile", {
            username: newUsername,
            display_name: newUsername,
            avatar_url: newAvatarUrl
        });

        const result = JSON.parse(
            typeof response.payload === "string"
                ? response.payload
                : JSON.stringify(response.payload)
        );

        if (result.success) {
            logSuccess("update_user_profile successful");
            logInfo(`Updated account: ${JSON.stringify(result.account, null, 2)}`);

            // Verify the update
            if (result.account.user.username === newUsername) {
                logSuccess("Username update verified");
            } else {
                logError(`Username mismatch: expected ${newUsername}, got ${result.account.user.username}`);
            }

            if (result.account.user.avatar_url === newAvatarUrl) {
                logSuccess("Avatar URL update verified");
            } else {
                logError(`Avatar URL mismatch: expected ${newAvatarUrl}, got ${result.account.user.avatar_url}`);
            }
        } else {
            logError(`update_user_profile failed: ${result.error}`);
        }

        return result.success;
    } catch (error: any) {
        logError(`update_user_profile error: ${error.message}`);
        return false;
    }
}

async function testFindMatch(session: Session) {
    logSection("Testing find_match RPC");

    try {
        logInfo("Finding match with mode: classic");

        const response = await client.rpc(session, "find_match", {
            mode: "classic"
        });

        const result = JSON.parse(
            typeof response.payload === "string"
                ? response.payload
                : JSON.stringify(response.payload)
        );

        if (result.matchId) {
            logSuccess("find_match successful");
            logInfo(`Match ID: ${result.matchId}`);
            return true;
        } else {
            logError("find_match failed: No match ID returned");
            return false;
        }
    } catch (error: any) {
        logError(`find_match error: ${error.message}`);
        return false;
    }
}

async function testCreateMatch(session: Session) {
    logSection("Testing create_match RPC");

    try {
        logInfo("Creating new match...");

        const response = await client.rpc(session, "create_match", {});

        const result = JSON.parse(
            typeof response.payload === "string"
                ? response.payload
                : JSON.stringify(response.payload)
        );

        if (result.matchId) {
            logSuccess("create_match successful");
            logInfo(`Match ID: ${result.matchId}`);
            return true;
        } else {
            logError("create_match failed: No match ID returned");
            return false;
        }
    } catch (error: any) {
        logError(`create_match error: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    log("\n╔══════════════════════════════════════════════════════════╗", colors.cyan);
    log("║       NAKAMA BACKEND API TEST SUITE                     ║", colors.cyan);
    log("╚══════════════════════════════════════════════════════════╝", colors.cyan);

    const results: { [key: string]: boolean } = {};

    // Test authentication
    const session = await testAuthentication();
    results["Authentication"] = session !== null;

    if (!session) {
        logError("\nAuthentication failed. Cannot proceed with other tests.");
        return;
    }

    // Test all RPCs
    results["get_user_account"] = await testGetUserAccount(session);
    results["update_user_profile"] = await testUpdateUserProfile(session);
    results["find_match"] = await testFindMatch(session);
    results["create_match"] = await testCreateMatch(session);

    // Print summary
    logSection("Test Summary");

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;
    const failedTests = totalTests - passedTests;

    log("\nResults:");
    for (const [test, passed] of Object.entries(results)) {
        if (passed) {
            logSuccess(`${test}`);
        } else {
            logError(`${test}`);
        }
    }

    log("\n" + "─".repeat(60));
    log(`Total Tests: ${totalTests}`, colors.blue);
    log(`Passed: ${passedTests}`, colors.green);
    log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
    log("─".repeat(60) + "\n");

    if (failedTests === 0) {
        log("🎉 All tests passed!", colors.green);
    } else {
        log("⚠️  Some tests failed. Please check the logs above.", colors.yellow);
    }
}

// Run the tests
runAllTests().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
