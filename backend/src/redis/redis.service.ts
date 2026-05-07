import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    this.client.on('connect', () => console.log('✅ Redis connected'));
    this.client.on('error', (err) =>
      console.error('❌ Redis error:', err.message),
    );
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /** Set a JSON value with optional TTL in seconds */
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /** Get and parse a JSON value */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  /** Get all keys matching a pattern */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
