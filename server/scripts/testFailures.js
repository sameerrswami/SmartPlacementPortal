/**
 * Smart Placement Portal — Failure & Chaos Resilience Test Suite
 * Tests Redis OFF, Redis RESTART, AI Failure, Expired Cache, and Fallback Degraded Modes.
 */

const { cacheService, CacheService } = require('../src/services/cache/cacheService');
const { cacheKeys, TTL } = require('../src/services/cache/cacheKeys');
const { getRedisClient, closeRedisConnection } = require('../src/services/cache/redis');
const { analyzeJobDescription } = require('../src/services/geminiService');
const { analyzeResumeAgainstJD } = require('../src/services/resumeService');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

const createMockRedis = () => {
  let store = new Map();
  let connected = true;
  return {
    async get(key) {
      if (!connected) throw new Error('ECONNREFUSED');
      const item = store.get(key);
      if (!item) return null;
      if (item.expiresAt && Date.now() > item.expiresAt) {
        store.delete(key);
        return null;
      }
      return item.val;
    },
    async set(key, val, mode, seconds) {
      if (!connected) throw new Error('ECONNREFUSED');
      let expiresAt = null;
      if (mode === 'EX' && seconds) {
        expiresAt = Date.now() + seconds * 1000;
      }
      store.set(key, { val, expiresAt });
      return 'OK';
    },
    async del(...keys) {
      if (!connected) throw new Error('ECONNREFUSED');
      let c = 0;
      for (const k of keys) {
        if (store.delete(k)) c++;
      }
      return c;
    },
    disconnect() {
      connected = false;
    },
    reconnect() {
      connected = true;
    },
    isConnected() {
      return connected;
    },
  };
};

async function runFailureTests() {
  console.log('===============================================================');
  console.log('       SMART PLACEMENT PORTAL — FAILURE RESILIENCE TESTS       ');
  console.log('===============================================================\n');

  // Setup test cache service with controllable redis engine
  const mockRedis = createMockRedis();
  const testCache = new CacheService(mockRedis);

  // -------------------------------------------------------------------------
  // TEST 1: Cache Expiry (TTL expiration)
  // -------------------------------------------------------------------------
  console.log('▶ SCENARIO 1: Cache Expiration & Invalidation Handling');
  const tempKey = 'test:temp:expiry_key';
  let counter = 0;

  const fetchVal = async () => {
    counter++;
    return { data: `version_${counter}`, timestamp: Date.now() };
  };

  // Initial populate with 1-second TTL
  const res1 = await testCache.remember(tempKey, 1, fetchVal);
  assert(res1.data.data === 'version_1', 'Initial fetcher returned version_1');
  assert(res1.cached === false, 'Initial call was a cache miss');

  // Immediate second call: must hit cache
  const res2 = await testCache.remember(tempKey, 1, fetchVal);
  assert(res2.data.data === 'version_1', 'Immediate call returned cached version_1');
  assert(res2.cached === true, 'Immediate call was a cache hit');
  assert(counter === 1, 'Fetcher was NOT called again during TTL window');

  // Wait 1.1s for TTL expiration
  console.log('  ...waiting 1100ms for cache TTL to expire...');
  await new Promise((resolve) => setTimeout(resolve, 1100));

  // Third call after expiration: must re-invoke fetcher
  const res3 = await testCache.remember(tempKey, 1, fetchVal);
  assert(res3.data.data === 'version_2', 'Post-expiration call fetched fresh data version_2');
  assert(res3.cached === false, 'Post-expiration call was a cache miss');
  assert(counter === 2, 'Fetcher was re-invoked on expired cache');

  // -------------------------------------------------------------------------
  // TEST 2: AI API Failure & Network Outage Handling
  // -------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 2: AI API Failure & Network Outage Fallback');
  const testJob = {
    title: 'Distributed Systems Engineer',
    company: { name: 'Acme Cloud Networks' },
    description: 'Looking for a Distributed Systems Engineer with Go, Python, Docker, Redis, and high concurrency expertise.',
    location: 'Remote',
    package: '25 LPA',
  };

  // Simulate API failure by giving an invalid key temporarily
  const origKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'invalid_simulated_key_that_fails_network';

  let aiResult = null;
  try {
    aiResult = await analyzeJobDescription(testJob);
  } catch (e) {
    aiResult = null;
  }

  assert(aiResult !== null, 'Job description analysis did not throw exception on API failure');
  assert(aiResult.summary && aiResult.summary.length > 0, 'Fallback generated valid strategic summary');
  assert(Array.isArray(aiResult.requiredSkills) && aiResult.requiredSkills.length > 0, 'Fallback generated required skills list');
  assert(Array.isArray(aiResult.dsaTopics) && aiResult.dsaTopics.length > 0, 'Fallback generated DSA roadmap');
  assert(aiResult.engine.includes('Deterministic') || aiResult.engine.includes('Fallback'), 'Fallback engine attribution verified');

  // Test Resume Analysis with simulated AI outage
  const sampleResume = {
    personal: { fullName: 'Failure Test Candidate' },
    skills: { languages: ['Python', 'Go'], frameworks: ['Docker', 'Redis'] },
    projects: [{ title: 'Cache Proxy', techStack: ['Go', 'Redis'], bullets: ['Built distributed cache'] }],
  };

  const resumeResult = await analyzeResumeAgainstJD(sampleResume, testJob.description, testJob);
  assert(resumeResult !== null, 'Resume analysis succeeded despite AI network failure');
  assert(typeof resumeResult.matchPercentage === 'number', 'Resume match percentage is a valid number');
  assert(resumeResult.atsScore >= 70, 'Resume ATS score generated accurately');

  // Restore env
  process.env.GEMINI_API_KEY = origKey;

  // -------------------------------------------------------------------------
  // TEST 3: Redis OFF / Disconnect Failure (Graceful Degradation)
  // -------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 3: Redis Service Outage (Redis OFF Graceful Degradation)');

  // Simulate Redis suddenly going OFF
  mockRedis.disconnect();

  // 3a. testCache.get() during Redis outage
  const getOffline = await testCache.get('any:key:when:offline');
  assert(getOffline === null, 'testCache.get() returns null safely when Redis is offline');

  // 3b. testCache.set() during Redis outage
  const setOffline = await testCache.set('any:key:when:offline', { val: 123 }, 60);
  assert(setOffline === false, 'testCache.set() returns false safely without crashing');

  // 3c. testCache.del() during Redis outage
  const delOffline = await testCache.del('any:key:when:offline');
  assert(delOffline === false, 'testCache.del() returns false safely without crashing');

  // 3d. testCache.remember() during Redis outage (must still execute the fetcher)
  let offlineFetcherCalled = false;
  const offlineResult = await testCache.remember('offline:fetch:test', 60, async () => {
    offlineFetcherCalled = true;
    return { status: 'operational_via_fallback' };
  });

  assert(offlineFetcherCalled === true, 'Fetcher executes normally when Redis is completely offline');
  assert(offlineResult.data.status === 'operational_via_fallback', 'Core data is returned intact to the user');
  assert(offlineResult.cached === false, 'Result indicates non-cached fetch');

  // -------------------------------------------------------------------------
  // TEST 4: Redis RESTART & Recovery
  // -------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 4: Redis Service Recovery (Redis RESTART)');

  // Simulate Redis RESTART
  mockRedis.reconnect();

  const recoveryKey = 'test:recovery:status';
  const saveOk = await testCache.set(recoveryKey, { restored: true, timestamp: Date.now() }, 60);
  assert(saveOk === true, 'Set operation succeeds after Redis restart');

  const recoveryData = await testCache.get(recoveryKey);
  assert(recoveryData !== null, 'Cache operations resume immediately after Redis reconnects');
  assert(recoveryData.restored === true, 'Restored cache value is correctly retrieved');
  await testCache.del(recoveryKey);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`   RESILIENCE TESTS COMPLETE: ${passedTests}/${totalTests} ASSERTIONS PASSED   `);
  console.log('===============================================================\n');

  const client = typeof redisClient !== 'undefined' ? redisClient : null;
  if (client && (client.status === 'ready' || client.status === 'connect')) {
    client.disconnect();
  }
}

runFailureTests().catch((err) => {
  console.error('Failure test run failed with error:', err);
  process.exit(1);
});
