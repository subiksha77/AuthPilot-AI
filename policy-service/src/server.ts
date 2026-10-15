/**
 * AuthPilot AI — Policy Service Entry Point
 */

import { app } from "./app.js";

const PORT = Number(process.env.PORT ?? 3002);

app.listen(PORT, () => {
  console.log(`[policy-service] Running on http://localhost:${PORT}`);
  console.log(`[policy-service] Health: http://localhost:${PORT}/health`);
  console.log(`[policy-service] DISCLAIMER: PRELIMINARY_ASSESSMENT_ONLY — not a clinical or legal system.`);
});
