const Redis = require('ioredis');

let redisClient = null;
let isReady = false;
let hasLoggedFailure = false;

/**
 * Sanitizes Redis connection strings or hosts to remove sensitive passwords from logs.
 */
const sanitizeRedisUrl = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
  }
};

/**
 * Initializes or returns the singleton Redis client.
 * Connects with exponential backoff and fail-safe configuration.
 */
const getRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;

  // If no Redis endpoint is configured, operate cleanly in direct MongoDB mode
  if (!redisUrl && !redisHost) {
    return null;
  }

  const redisPassword = process.env.REDIS_PASSWORD || undefined;
  const redisUsername = process.env.REDIS_USERNAME || undefined;

  const isTlsExplicit = process.env.REDIS_TLS === 'true';
  const isTlsUrl = Boolean(redisUrl && redisUrl.startsWith('rediss://'));
  const useTls = isTlsExplicit || isTlsUrl;
  const rejectUnauthorized = process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false';

  const redisOptions = {
    // Fail-safe: do not queue commands when disconnected to avoid memory growth
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    lazyConnect: false,
    retryStrategy: (times) => {
      // Exponential backoff capped at 2000ms
      const delay = Math.min(times * 150, 2000);
      return delay;
    },
    ...(useTls ? { tls: { rejectUnauthorized } } : {}),
  };

  try {
    if (redisUrl && redisUrl.trim()) {
      redisClient = new Redis(redisUrl.trim(), redisOptions);
    } else {
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        ...(redisPassword ? { password: redisPassword } : {}),
        ...(redisUsername ? { username: redisUsername } : {}),
        ...redisOptions,
      });
    }


    const endpointDescriptor = redisUrl
      ? sanitizeRedisUrl(redisUrl.trim())
      : `${redisHost}:${redisPort}${useTls ? ' (TLS)' : ''}`;

    redisClient.on('connect', () => {
      // Connection socket established
    });

    redisClient.on('ready', () => {
      isReady = true;
      hasLoggedFailure = false;
      console.log(`[Redis] Connected and ready (${endpointDescriptor})`);
    });

    redisClient.on('error', (err) => {
      isReady = false;
      // Log once per failure cycle to avoid log flooding during downtime
      if (!hasLoggedFailure) {
        console.warn(`[Redis Notice] Cache unavailable (${err.message}). Application will serve from MongoDB.`);
        hasLoggedFailure = true;
      }
    });

    redisClient.on('close', () => {
      isReady = false;
    });

    redisClient.on('reconnecting', () => {
      isReady = false;
    });

    redisClient.on('end', () => {
      isReady = false;
    });
  } catch (err) {
    console.warn(`[Redis Notice] Failed to initialize Redis client (${err.message}). Operating in cache-bypass mode.`);
    redisClient = null;
    isReady = false;
  }

  return redisClient;
};

/**
 * Returns whether Redis is currently connected and accepting commands.
 */
const isRedisReady = () => {
  return Boolean(redisClient && isReady);
};

/**
 * Actively executes a PING command against Redis to verify live responsiveness.
 */
const pingRedis = async () => {
  if (!isRedisReady()) return false;
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (err) {
    return false;
  }
};

/**
 * Returns detailed connection health status.
 */
const getRedisStatus = () => {
  const redisUrl = process.env.REDIS_URL;
  const configuredHost = process.env.REDIS_HOST;

  if (!redisUrl && !configuredHost) {
    return {
      status: 'disabled',
      isReady: false,
      host: 'none',
      port: 0,
      tls: false,
      message: 'Redis not configured (Serving directly from MongoDB Atlas)',
    };
  }

  const ready = isRedisReady();
  let host = configuredHost || '127.0.0.1';
  let port = parseInt(process.env.REDIS_PORT, 10) || 6379;

  if (redisUrl) {
    try {
      const u = new URL(redisUrl);
      host = u.hostname || host;
      port = parseInt(u.port, 10) || port;
    } catch {
      host = sanitizeRedisUrl(redisUrl);
    }
  }

  return {
    status: ready ? 'connected' : 'disconnected',
    isReady: ready,
    host,
    port,
    tls: process.env.REDIS_TLS === 'true' || Boolean(redisUrl && redisUrl.startsWith('rediss://')),
  };
};


/**
 * Gracefully shuts down the Redis connection.
 */
const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      console.log('[Redis] Closing connection gracefully...');
      isReady = false;
      await redisClient.quit();
      console.log('[Redis] Connection closed.');
    } catch (err) {
      console.warn(`[Redis] Error during shutdown: ${err.message}`);
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
};

module.exports = {
  getRedisClient,
  isRedisReady,
  pingRedis,
  getRedisStatus,
  closeRedisConnection,
  sanitizeRedisUrl,
};

