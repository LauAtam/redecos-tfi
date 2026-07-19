import { Test, TestingModule } from '@nestjs/testing';
import { BuyGroupsCronService } from './buy-groups-cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './infrastructure/mercado-pago.service';

describe('BuyGroupsCronService', () => {
  let service: BuyGroupsCronService;
  let prisma: PrismaService;

  const mockPrismaService = {
    buy_groups: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    group_orders: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMercadoPagoService = {
    cancelPayment: jest.fn().mockResolvedValue(true),
    refundPayment: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyGroupsCronService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MercadoPagoService,
          useValue: mockMercadoPagoService,
        },
      ],
    }).compile();

    service = module.get<BuyGroupsCronService>(BuyGroupsCronService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleExpiration', () => {
    it('should do nothing if no expired groups found', async () => {
      mockPrismaService.buy_groups.findMany.mockResolvedValueOnce([]);

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.handleExpiration();

      expect(mockPrismaService.buy_groups.findMany).toHaveBeenCalled();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('No se encontraron grupos vencidos para cancelar.');
    });

    it('should cancel expired groups and their HELD orders inside a transaction', async () => {
      const mockExpiredGroups = [{ id: 'group-1' }, { id: 'group-2' }];
      mockPrismaService.buy_groups.findMany.mockResolvedValueOnce(mockExpiredGroups);

      const mockPendingOrders = [
        { id: 'order-1', payment_intent_id: 'payment-1' },
        { id: 'order-2', payment_intent_id: 'payment-2' },
      ];
      mockPrismaService.group_orders.findMany
        .mockResolvedValueOnce(mockPendingOrders) // Primer llamado (PAYMENT_HELD)
        .mockResolvedValueOnce([]); // Segundo llamado (CONFIRMED)

      // Simular ejecución de transacción ejecutando la callback provista
      mockPrismaService.$transaction.mockImplementationOnce(async (cb) => {
        return await cb(mockPrismaService);
      });

      await service.handleExpiration();

      expect(mockPrismaService.buy_groups.findMany).toHaveBeenCalled();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.buy_groups.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['group-1', 'group-2'] } },
        data: { status: 'CANCELLED' },
      });
      expect(mockPrismaService.group_orders.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['order-1', 'order-2'] },
        },
        data: { status: 'CANCELLED' },
      });
    });

    it('should cancel expired groups, release HELD orders and refund CONFIRMED orders', async () => {
      const mockExpiredGroups = [{ id: 'group-1' }];
      mockPrismaService.buy_groups.findMany.mockResolvedValueOnce(mockExpiredGroups);

      const mockPendingOrders = [
        { id: 'order-held', payment_intent_id: 'payment-held-id' },
      ];
      const mockConfirmedOrders = [
        { id: 'order-confirmed', payment_intent_id: 'payment-confirmed-id' },
      ];

      mockPrismaService.group_orders.findMany
        .mockResolvedValueOnce(mockPendingOrders) // Primer llamado (PAYMENT_HELD)
        .mockResolvedValueOnce(mockConfirmedOrders); // Segundo llamado (CONFIRMED)

      // Simular ejecución de transacción
      mockPrismaService.$transaction.mockImplementationOnce(async (cb) => {
        return await cb(mockPrismaService);
      });

      await service.handleExpiration();

      expect(mockMercadoPagoService.cancelPayment).toHaveBeenCalledWith('payment-held-id');
      expect(mockMercadoPagoService.refundPayment).toHaveBeenCalledWith('payment-confirmed-id');

      expect(mockPrismaService.buy_groups.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['group-1'] } },
        data: { status: 'CANCELLED' },
      });

      expect(mockPrismaService.group_orders.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['order-held', 'order-confirmed'] },
        },
        data: { status: 'CANCELLED' },
      });
    });
  });
});
