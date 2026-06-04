import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TrackingGateway } from './tracking.gateway';

describe('TrackingService', () => {
  let service: TrackingService;
  let redis: jest.Mocked<Pick<RedisService, 'getJson' | 'setJson' | 'keys'>>;
  let createManyMock: jest.Mock;
  let gateway: jest.Mocked<
    Pick<TrackingGateway, 'emitVehicleUpdate' | 'emitVehicleStopped'>
  >;

  beforeEach(async () => {
    redis = {
      getJson: jest.fn(),
      setJson: jest.fn().mockResolvedValue(undefined),
      keys: jest.fn().mockResolvedValue([]),
    };

    createManyMock = jest.fn().mockResolvedValue({ count: 0 });

    const prisma = {
      trackingPoint: {
        createMany: createManyMock,
      },
      vehicle: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    gateway = {
      emitVehicleUpdate: jest.fn(),
      emitVehicleStopped: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: TrackingGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('detectStatus', () => {
    const vehicleId = 'VH-001';
    const now = new Date('2024-06-01T12:00:00Z');

    it('returns MOVING when speed is above threshold', async () => {
      redis.getJson.mockResolvedValue(null);

      const result = await service['detectStatus'](vehicleId, 45, now);

      expect(result).toEqual({ status: 'MOVING', justStopped: false });
    });

    it('returns MOVING when speed is low but duration is under 2 minutes', async () => {
      redis.getJson.mockResolvedValue({
        firstSlowTimestamp: new Date(now.getTime() - 60_000).toISOString(),
        currentStatus: 'MOVING',
      });

      const result = await service['detectStatus'](vehicleId, 2, now);

      expect(result).toEqual({ status: 'MOVING', justStopped: false });
    });

    it('returns STOPPED with justStopped=true after slow duration exceeds threshold', async () => {
      redis.getJson.mockResolvedValue({
        firstSlowTimestamp: new Date(now.getTime() - 121_000).toISOString(),
        currentStatus: 'MOVING',
      });

      const result = await service['detectStatus'](vehicleId, 2, now);

      expect(result).toEqual({ status: 'STOPPED', justStopped: true });
      expect(redis.setJson).toHaveBeenCalled();
    });

    it('returns MOVING when speed recovers after being slow', async () => {
      redis.getJson.mockResolvedValue({
        firstSlowTimestamp: now.toISOString(),
        currentStatus: 'MOVING',
      });

      const result = await service['detectStatus'](vehicleId, 50, now);

      expect(result).toEqual({ status: 'MOVING', justStopped: false });
      expect(redis.setJson).toHaveBeenCalledWith(
        'vehicle:stop_state:VH-001',
        expect.objectContaining({ currentStatus: 'MOVING' }),
        expect.any(Number),
      );
    });
  });

  describe('flushBuffer', () => {
    it('does not call prisma.createMany when buffer is empty', async () => {
      await service['flushBuffer']();

      expect(createManyMock).not.toHaveBeenCalled();
    });

    it('flushes buffered records and clears the buffer', async () => {
      service['writeBuffer'].push({
        vehicleId: 'VH-001',
        lat: -7.25,
        lon: 112.75,
        speed: 40,
        heading: 90,
        status: 'MOVING',
        timestamp: new Date(),
      });

      await service['flushBuffer']();

      expect(createManyMock).toHaveBeenCalledTimes(1);
      const calls = createManyMock.mock.calls as [
        { data: { vehicleId: string }[] },
      ][];
      expect(calls[0][0].data).toHaveLength(1);
      expect(calls[0][0].data[0].vehicleId).toBe('VH-001');
      expect(service['writeBuffer']).toHaveLength(0);
    });

    it('restores buffer when database flush fails', async () => {
      service['writeBuffer'].push({
        vehicleId: 'VH-002',
        lat: -7.26,
        lon: 112.76,
        speed: 10,
        heading: 180,
        status: 'STOPPED',
        timestamp: new Date(),
      });

      createManyMock.mockRejectedValueOnce(new Error('DB unavailable'));

      await service['flushBuffer']();

      expect(service['writeBuffer']).toHaveLength(1);
      expect(service['writeBuffer'][0].vehicleId).toBe('VH-002');
    });
  });

  describe('processLocation', () => {
    it('emits vehicle:stopped when vehicle transitions to STOPPED', async () => {
      const timestamp = new Date('2024-06-01T12:05:00Z');
      redis.getJson.mockResolvedValue({
        firstSlowTimestamp: new Date(
          timestamp.getTime() - 130_000,
        ).toISOString(),
        currentStatus: 'MOVING',
      });

      await service.processLocation({
        vehicleId: 'VH-001',
        vehicleType: 'CITY',
        lat: -7.25,
        lon: 112.75,
        speed: 1,
        heading: 0,
        driveState: 'DRIVING',
        timestamp,
      });

      expect(gateway.emitVehicleUpdate).toHaveBeenCalled();
      expect(gateway.emitVehicleStopped).toHaveBeenCalledWith(
        'VH-001',
        -7.25,
        112.75,
      );
    });
  });
});
