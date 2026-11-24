# QA baseline — 2026-11-24
PASS: 11 ZIP integrity checks; duplicate source content comparison; 10/10 pure-core Node tests (see audit/baseline-output.txt): both arenas validated, split tree/caps, invalid asset and cycle rejection, pending/wave/win/loss/reset state, aim directions. These are tests against original unchanged code, not browser gameplay.
FAIL (static build readiness): referenced inline-dist script and original tests missing; no dedicated lockfile or dist.
NOT TESTED: npm install/ci, TypeScript typecheck, Vite build, browser render/gameplay, real Arcade collision, touch, offline execution, owner fun/balance. No claim of playable release.
