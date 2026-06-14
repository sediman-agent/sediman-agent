/**
 * Jest early setup — runs BEFORE the test framework and before any test file
 * (or setupFilesAfterEach) is imported.
 *
 * The single most important thing this file does is force NODE_ENV to "test".
 *
 * Why: React's CommonJS entry (`react/index.js`) branches on
 * `process.env.NODE_ENV === 'production'`. When NODE_ENV is "production",
 * React loads `react.production.min.js`, which strips out the testing-only
 * `act()` helper. That makes every React test fail with:
 *
 *   "act(...) is not supported in production builds of React."
 *
 * On developer machines where the shell exports NODE_ENV=production (common on
 * macOS with certain dotfiles), Jest inherits that value and the entire test
 * suite collapses. Setting it here — before React is imported — is the
 * reliable fix that does not depend on the developer's shell environment.
 */
process.env.NODE_ENV = 'test';
