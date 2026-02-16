// Code Stripper - Solidity comment removal
//
// CRITICAL: Prevents prompt injection attacks via contract comments.
// Attackers embed malicious instructions inside Solidity comments.
// This module strips ALL comments before sending code to LLM,
// ensuring only pure logic is analyzed.

// Strip all comments from Solidity source code
// Removes single-line (//) and multi-line comments
export function stripSolidityComments(source: string): string {
  // Remove multi-line comments (non-greedy)
  let stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove single-line comments
  stripped = stripped.replace(/\/\/.*$/gm, '');

  // Collapse multiple blank lines into one
  stripped = stripped.replace(/\n\s*\n\s*\n/g, '\n\n');

  return stripped.trim();
}

/**
 * Strip comments and normalize whitespace for cleaner LLM input
 */
export function dehydrateCode(source: string): string {
  const stripped = stripSolidityComments(source);

  // Remove leading/trailing whitespace per line
  const lines = stripped
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  return lines.join('\n');
}
