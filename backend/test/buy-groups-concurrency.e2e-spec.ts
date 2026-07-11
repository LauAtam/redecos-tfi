import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BuyGroupsRepository } from '../src/buy-groups/interfaces/buy-groups-repository.interface';
import { MercadoPagoService } from '../src/buy-groups/infrastructure/mercado-pago.service';
import { JoinGroupDto } from '../src/buy-groups/dto/join-group.dto';
import { BadRequestException } from '@nestjs/common';

describe('BuyGroups Concurrency (E2E)', () => {
  let app: TestingModule;
  let prisma: PrismaService;
  let repo: BuyGroupsRepository;

  let testProduct: any;
  let testNode: any;
  let testUser: any;

  let originalBulkSize: number;
  let originalStock: number;

  const mockMercadoPagoService = {
    createPreauthorizedPayment: jest.fn(),
    capturePayment: jest.fn(),
    cancelPayment: jest.fn(),
  };

  beforeAll(async () => {
    // Darle tiempo a las conexiones previas de Jest para cerrarse y evitar la saturación del pool
    await new Promise((resolve) => setTimeout(resolve, 5000));

    app = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MercadoPagoService)
      .useValue(mockMercadoPagoService)
      .compile();

    prisma = app.get(PrismaService);
    repo = app.get(BuyGroupsRepository);

    // Obtener registros reales para la prueba
    testProduct = await prisma.productos.findFirst({ select: { id: true, bulk_size: true, stock: true } });
    testNode = await prisma.nodos.findFirst({ select: { id: true } });
    testUser = await prisma.profiles.findFirst({ select: { id: true } });

    if (!testProduct || !testNode || !testUser) {
      throw new Error('Se requiere al menos un producto, un nodo y un usuario en la DB para ejecutar este test.');
    }

    originalBulkSize = testProduct.bulk_size;
    originalStock = testProduct.stock;

    // Configurar producto de prueba: bulto de 2 y stock de 5
    await prisma.productos.update({
      where: { id: testProduct.id },
      data: { bulk_size: 2, price: 1.0, stock: 5 },
    });
  });

  afterAll(async () => {
    // Restaurar datos originales del producto
    await prisma.productos.update({
      where: { id: testProduct.id },
      data: { bulk_size: originalBulkSize, stock: originalStock },
    });

    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Limpiar grupos previos abiertos para el par producto-nodo
    await prisma.buy_groups.updateMany({
      where: { product_id: testProduct.id, node_id: testNode.id, status: 'OPEN' },
      data: { status: 'CANCELLED' },
    });

    // Mockear MercadoPagoService para simular delay de 2 segundos en el llamado a MP
    mockMercadoPagoService.createPreauthorizedPayment.mockImplementation(async () => {
      // Delay para forzar la superposición temporal
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        id: Math.floor(Math.random() * 1000000000).toString(),
        status: 'authorized',
      };
    });

    mockMercadoPagoService.capturePayment.mockResolvedValue(true);
    mockMercadoPagoService.cancelPayment.mockResolvedValue(true);
  });

  afterEach(async () => {
    // Eliminar órdenes de prueba creadas durante el test
    const testGroup = await prisma.buy_groups.findFirst({
      where: { product_id: testProduct.id, node_id: testNode.id, status: 'COMPLETED' },
    });
    if (testGroup) {
      await prisma.group_orders.deleteMany({ where: { group_id: testGroup.id } });
      await prisma.buy_groups.delete({ where: { id: testGroup.id } });
    }
  });

  it('debería bloquear y rechazar la compra concurrente que excede el cupo del bulto (evitando sobreventa)', async () => {
    const dto: JoinGroupDto = {
      productId: testProduct.id,
      nodeId: testNode.id,
      quantity: 1,
      paymentToken: 'test_token',
      paymentMethodId: 'master',
      cardholderEmail: 'test@example.com',
    };

    // 1. Unirse para comprar la primera unidad (cupo restante = 1)
    await repo.joinOrCreateGroup(testUser.id, dto);

    // 2. Disparar dos peticiones simultáneas para la última unidad disponible
    const promises = [
      repo.joinOrCreateGroup(testUser.id, dto)
        .then((res) => ({ success: true, order: res, error: null }))
        .catch((err) => ({ success: false, order: null, error: err })),
      repo.joinOrCreateGroup(testUser.id, dto)
        .then((res) => ({ success: true, order: res, error: null }))
        .catch((err) => ({ success: false, order: null, error: err })),
    ];

    const [res1, res2] = await Promise.all(promises);

    // Verificar que una petición fue exitosa y la otra fue rechazada
    const successes = [res1, res2].filter((r) => r.success);
    const failures = [res1, res2].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // El error de la fallida debe indicar que se excedió el cupo
    expect(failures[0].error).toBeInstanceOf(BadRequestException);
    expect(failures[0].error.message).toContain('supera las unidades disponibles');

    // Validar base de datos: exactamente 2 unidades vendidas y el grupo cerrado en COMPLETED
    const groupInDb = await prisma.buy_groups.findFirst({
      where: { product_id: testProduct.id, node_id: testNode.id, status: 'COMPLETED' },
      include: { group_orders: true },
    });

    expect(groupInDb).toBeDefined();
    expect(groupInDb?.status).toBe('COMPLETED');
    expect(groupInDb?.group_orders).toHaveLength(2);
    
    const totalQty = groupInDb?.group_orders.reduce((sum, o) => sum + o.quantity, 0) || 0;
    expect(totalQty).toBe(2);
  }, 90000); // 90 segundos de timeout por el delay de MP y latencia de DB en la nube
});

