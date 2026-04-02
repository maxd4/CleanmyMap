import { Redis } from "@upstash/redis";
import { Client as QstashClient } from "@upstash/qstash";
import { env } from "@/lib/env";

let redis: Redis | null = null;
let qstash: QstashClient | null = null;

export function getRedisClient() {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (redis) return redis;

  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

export function getQStashClient() {
  if (!env.QSTASH_TOKEN) return null;
  if (qstash) return qstash;

  qstash = new QstashClient({ token: env.QSTASH_TOKEN });
  return qstash;
}
