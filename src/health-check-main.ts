/**
 * Main entry point for the health check system.
 * Wires together: config parser → health check runner → alerting.
 */

import { parsePublisherConfig } from './config/config-parser.js';
import { runHealthCheck } from './health-check/runner.js';
import { processHealthCheckResults } from './health-check/alerter.js';

async function main(): Promise<void> {
  console.log('[HealthCheck] Loading publisher configurations...');
  const configs = parsePublisherConfig();
  console.log(`[HealthCheck] Loaded ${configs.length} publisher configs.`);

  console.log('[HealthCheck] Running health checks...');
  const result = await runHealthCheck(configs);

  console.log(`[HealthCheck] Results: ${result.passed.length} passed, ${result.failed.length} failed`);

  await processHealthCheckResults(result);
}

main().catch(err => {
  console.error('[HealthCheck] Fatal error:', err);
  process.exit(1);
});
