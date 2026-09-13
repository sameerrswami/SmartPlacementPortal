/**
 * ===================================================================
 * SMART PLACEMENT PORTAL — CONCURRENCY & STAMPEDE BENCHMARK
 * ===================================================================
 * Verifies single-flight deduplication under 10, 50, and 100 concurrent
 * simultaneous requests to an un-cached expensive AI operation.
 * Measures latency, memory, and exact number of external AI calls executed.
 */

const { CacheService } = require('../src/services/cache/cacheService');
const { generateDeterministicAnalysis } = require('../src/services/geminiService');

const createSimulatedRedis = () => {
  const map = new Map();
  return {
    async get(k) {
      const v = map.get(k);
      return v ? v : null;
    },
    async set(k, v) {
      map.set(k, v);
      return 'OK';
    },
    async del(...keys) {
      keys.forEach((k) => map.delete(k));
      return keys.length;
    },
  };
};

const runConcurrencyTest = async (concurrencyLevel) => {
  const simulatedRedis = createSimulatedRedis();
  const cache = new CacheService(simulatedRedis);

  const testKey = `ai:benchmark:concurrency-${concurrencyLevel}:${Date.now()}`;
  let actualAiCallsMade = 0;

  const mockJob = {
    title: 'Senior Distributed Systems Architect',
    company: { name: 'Google' },
    description: 'Design multi-region active-active databases, Raft consensus, and high-throughput Redis caching layers.',
  };

  // Simulates an expensive AI generation taking 30ms of processing time
  const expensiveAiGenerator = async () => {
    actualAiCallsMade += 1;
    await new Promise((resolve) => setTimeout(resolve, 30));
    return generateDeterministicAnalysis(mockJob);
  };

  const startTime = Date.now();
  const initialMemory = process.memoryUsage().heapUsed;

  // Fire N simultaneous concurrent requests
  const requests = Array.from({ length: concurrencyLevel }).map((_, i) =>
    cache.remember(testKey, 60, expensiveAiGenerator).then((res) => ({
      index: i,
      cached: res.cached,
      source: res.source,
      summary: res.data.summary,
    }))
  );

  const responses = await Promise.all(requests);
  const totalDuration = Date.now() - startTime;
  const memoryDeltaKb = Math.round((process.memoryUsage().heapUsed - initialMemory) / 1024);

  // Assertions
  if (responses.length !== concurrencyLevel) {
    throw new Error(`Expected ${concurrencyLevel} responses, received ${responses.length}`);
  }
  if (actualAiCallsMade !== 1) {
    throw new Error(`FAILED: For ${concurrencyLevel} requests, expected 1 AI call but executed ${actualAiCallsMade}!`);
  }

  // Verify all responses received valid verified intelligence
  responses.forEach((r) => {
    if (!r.summary.includes('Google')) {
      throw new Error('Response payload was corrupted or empty');
    }
  });

  const callsSaved = concurrencyLevel - actualAiCallsMade;
  const savingsPct = ((callsSaved / concurrencyLevel) * 100).toFixed(1);

  console.log(`\n▶ CONCURRENCY LEVEL: ${concurrencyLevel} SIMULTANEOUS REQUESTS`);
  console.log(`  ├─ Total Requests Sent:         ${concurrencyLevel}`);
  console.log(`  ├─ Actual AI API Calls Made:    ${actualAiCallsMade} (Single-Flight Lock)`);
  console.log(`  ├─ Duplicate AI Calls Prevented: ${callsSaved} (${savingsPct}% Cost Reduction)`);
  console.log(`  ├─ Total Batch Latency:         ${totalDuration} ms`);
  console.log(`  ├─ Average Latency per Request: ${(totalDuration / concurrencyLevel).toFixed(2)} ms`);
  console.log(`  └─ Memory Impact:               +${memoryDeltaKb} KB`);

  // Now verify that request N+1 (pure Cache HIT) is instantaneous
  const hitStart = Date.now();
  const cachedHit = await cache.remember(testKey, 60, expensiveAiGenerator);
  const hitDuration = Date.now() - hitStart;

  if (!cachedHit.cached || actualAiCallsMade !== 1) {
    throw new Error('Subsequent call was not served directly from cache!');
  }

  console.log(`  ▶ Follow-up Cache HIT Latency:  ${hitDuration} ms (100% Cache HIT, 0 AI calls)`);

  return {
    concurrencyLevel,
    actualAiCallsMade,
    callsSaved,
    savingsPct,
    totalDuration,
    hitDuration,
  };
};

const runAllBenchmarks = async () => {
  console.log('\n===============================================================');
  console.log('   SMART PLACEMENT PORTAL — CONCURRENCY & STAMPEDE BENCHMARK   ');
  console.log('===============================================================');

  const levels = [10, 50, 100];
  const summary = [];

  for (const level of levels) {
    const res = await runConcurrencyTest(level);
    summary.push(res);
  }

  console.log('\n===============================================================');
  console.log('                     BENCHMARK SUMMARY TABLE                   ');
  console.log('===============================================================');
  console.log(' Concurrent Req | AI Calls Made | Calls Saved | Cost Savings | Latency ');
  console.log('----------------+---------------+-------------+--------------+---------');
  summary.forEach((s) => {
    const reqCol = String(s.concurrencyLevel).padEnd(15);
    const callCol = String(s.actualAiCallsMade).padEnd(13);
    const saveCol = String(s.callsSaved).padEnd(11);
    const pctCol = `${s.savingsPct}%`.padEnd(12);
    const latCol = `${s.totalDuration}ms`;
    console.log(` ${reqCol}| ${callCol}| ${saveCol}| ${pctCol} | ${latCol}`);
  });
  console.log('===============================================================\n');

  console.log('✓ VERIFIED: 10, 50, and 100 simultaneous requests NEVER cause duplicate AI API calls.');
  process.exit(0);
};

runAllBenchmarks().catch((err) => {
  console.error('[Benchmark Failure]', err);
  process.exit(1);
});
