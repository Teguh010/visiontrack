import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma v7 with nodenext module resolution
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new (opts: { adapter: PrismaPg }) => {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    vehicle: {
      findMany(args?: object): Promise<unknown[]>;
      findUnique(args: object): Promise<unknown | null>;
      upsert(args: object): Promise<unknown>;
      create(args: object): Promise<unknown>;
    };
    trackingPoint: {
      create(args: object): Promise<unknown>;
      findMany(args?: object): Promise<unknown[]>;
    };
  };
};

type PrismaClientInstance = ReturnType<(typeof PrismaClient extends new (...args: infer _) => infer R ? () => R : never)>;

let _prisma: ReturnType<typeof createClient> | null = null;

function createClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getClient() {
  if (!_prisma) _prisma = createClient();
  return _prisma;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly db = getClient();

  get vehicle() { return this.db.vehicle; }
  get trackingPoint() { return this.db.trackingPoint; }

  async onModuleInit() {
    await this.db.$connect();
    console.log("✅ Prisma connected to PostgreSQL");
  }

  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
