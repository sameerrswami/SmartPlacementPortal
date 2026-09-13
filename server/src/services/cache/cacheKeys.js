const crypto = require('crypto');

/**
 * Computes a normalized SHA-256 hash of any input string or object.
 * Trims whitespace and lowercases input for deterministic consistency.
 */
const computeHash = (content) => {
  if (!content) return 'empty';
  const text = typeof content === 'object' ? JSON.stringify(content) : String(content);
  return crypto
    .createHash('sha256')
    .update(text.trim().toLowerCase())
    .digest('hex')
    .substring(0, 32); // 32 hex chars provides 128 bits of collision resistance
};

const AI_CACHE_VERSION = process.env.AI_CACHE_VERSION || 'v1';

/**
 * Deterministic cache key factories with schema versioning.
 */
const cacheKeys = {
  computeHash,
  AI_CACHE_VERSION,

  /**
   * 1. AI JD Analysis Key: ai:jd-analysis:{jdHash}:{version}
   * Caches JD summary, skills, technologies, DSA topics, CS topics, interview topics.
   */
  jdAnalysis: (jdHash) => `ai:jd-analysis:${jdHash}:${AI_CACHE_VERSION}`,

  /**
   * 2. Resume + JD Analysis Key: ai:resume-analysis:{resumeHash}:{jdHash}:{version}
   * A different resume or JD always produces a different cache key.
   */
  resumeAnalysis: (resumeHash, jdHash) => `ai:resume-analysis:${resumeHash}:${jdHash}:${AI_CACHE_VERSION}`,

  /**
   * 3. AI Preparation Plan Key: ai:prep-plan:{jobId}:{jdHash}:{version}
   */
  prepPlan: (jobId, jdHash) => `ai:prep-plan:${jobId}:${jdHash}:${AI_CACHE_VERSION}`,

  /**
   * 4. Job Drive Detail Key: jobs:detail:{jobId}:v1
   */
  jobDetail: (jobId) => `jobs:detail:${jobId}:v1`,

  /**
   * 5. Job Drive Listing Key: jobs:list:{filterHash}:v1
   */
  jobsList: (filterHash = 'all') => `jobs:list:${filterHash}:v1`,

  /**
   * 6. Curated Questions Repository Key: questions:raw:all:v1
   */
  questionsRaw: () => 'questions:raw:all:v1',

  /**
   * 7. Questions Filtered Directory Key: questions:list:{filterHash}:v1
   */
  questionsList: (filterHash = 'all') => `questions:list:${filterHash}:v1`,

  /**
   * 8. Admin Intelligence Dashboard Key: admin:intelligence:v1
   */
  adminIntelligence: () => 'admin:intelligence:v1',

  /**
   * Distributed Lock Key for Cache Stampede Protection: lock:{resource}
   */
  lockKey: (resource) => `lock:${resource}`,
};

/**
 * TTL Definitions (in seconds) tailored to data volatility and criticality.
 */
const TTL = {
  // 24 Hours: Campus drive JDs are static once published. MongoDB retains permanent Tier-2 copy.
  AI_JD_ANALYSIS: 86400,

  // 12 Hours: Deterministic for identical (resumeHash, jdHash) pairs. Keeps memory bounded.
  AI_RESUME_ANALYSIS: 43200,

  // 24 Hours: Preparation roadmaps remain constant throughout an ongoing drive.
  PREPARATION_PLANS: 86400,

  // 5 Minutes: Frequently read job details; invalidated immediately on admin update/delete.
  JOB_DETAILS: 300,

  // 2 Minutes: Listing directory accessed on every portal visit; fast response, short freshness window.
  JOB_LISTINGS: 120,

  // 10 Minutes: Curated LeetCode/GFG questions list; rarely mutated, fast student access.
  QUESTIONS_LIST: 600,

  // 60 Seconds: Aggregated Admin KPIs; short TTL, auto-invalidated on application/job updates.
  ADMIN_INTELLIGENCE: 60,

  // 15 Seconds: Temporary mutex lock for AI deduplication / stampede protection.
  LOCK: 15,
};

module.exports = {
  cacheKeys,
  TTL,
};

