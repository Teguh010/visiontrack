import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TrackingMqtt } from './tracking.mqtt';
import { TrackingService } from './tracking.service';

jest.mock('mqtt', () => ({
  connect: jest.fn(() => ({
    on: jest.fn(),
    subscribe: jest.fn(),
    end: jest.fn(),
  })),
}));

describe('TrackingMqtt', () => {
  let mqttConsumer: TrackingMqtt;
  let trackingService: jest.Mocked<Pick<TrackingService, 'processLocation'>>;

  beforeEach(async () => {
    trackingService = {
      processLocation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingMqtt,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mqtt://localhost:1883'),
          },
        },
        { provide: TrackingService, useValue: trackingService },
      ],
    }).compile();

    mqttConsumer = module.get<TrackingMqtt>(TrackingMqtt);
  });

  describe('handleMessage', () => {
    it('forwards valid payload to TrackingService.processLocation', () => {
      const payload = {
        lat: -7.25,
        lon: 112.75,
        speed: 45,
        heading: 90,
        vehicleType: 'CITY',
        timestamp: 1714210000,
      };

      mqttConsumer['handleMessage'](
        'vehicle/VH-001/location',
        Buffer.from(JSON.stringify(payload)),
      );

      expect(trackingService.processLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleId: 'VH-001',
          lat: -7.25,
          lon: 112.75,
          speed: 45,
        }),
      );
    });

    it('drops payload when required fields are missing', () => {
      mqttConsumer['handleMessage'](
        'vehicle/VH-001/location',
        Buffer.from(JSON.stringify({ lat: -7.25 })),
      );

      expect(trackingService.processLocation).not.toHaveBeenCalled();
    });

    it('handles invalid JSON without throwing', () => {
      expect(() => {
        mqttConsumer['handleMessage'](
          'vehicle/VH-001/location',
          Buffer.from('not-json'),
        );
      }).not.toThrow();

      expect(trackingService.processLocation).not.toHaveBeenCalled();
    });

    it('drops message when vehicleId cannot be extracted from topic', () => {
      mqttConsumer['handleMessage'](
        'vehicle//location',
        Buffer.from(JSON.stringify({ lat: 1, lon: 2, speed: 3 })),
      );

      expect(trackingService.processLocation).not.toHaveBeenCalled();
    });

    it('drops messages when per-vehicle rate limit is exceeded', () => {
      const payload = { lat: -7.25, lon: 112.75, speed: 45 };
      const topic = 'vehicle/VH-999/location';
      const buffer = Buffer.from(JSON.stringify(payload));

      for (let i = 0; i < 31; i++) {
        mqttConsumer['handleMessage'](topic, buffer);
      }

      expect(trackingService.processLocation).toHaveBeenCalledTimes(30);
    });
  });
});
