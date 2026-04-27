import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
export declare class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly db;
    get vehicle(): {
        findMany(args?: object): Promise<unknown[]>;
        findUnique(args: object): Promise<unknown | null>;
        upsert(args: object): Promise<unknown>;
        create(args: object): Promise<unknown>;
    };
    get trackingPoint(): {
        create(args: object): Promise<unknown>;
        findMany(args?: object): Promise<unknown[]>;
    };
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
