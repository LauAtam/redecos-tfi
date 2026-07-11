import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoService } from '../src/buy-groups/infrastructure/mercado-pago.service';
import * as jwt from 'jsonwebtoken';

describe('BuyGroups Admin (E2E)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let config: ConfigService;

  let jwtSecret: string;
  let adminToken: string;
  let nodoAToken: string;
  let nodoBToken: string;

  let product: any;
  let nodeA: any;
  let nodeB: any;

  let adminUser: any;
  let nodoAUser: any;
  let nodoBUser: any;

  let groupNodeA: any;
  let groupNodeB: any;

  const mockMercadoPagoService = {
    createPreauthorizedPayment: jest.fn(),
    capturePayment: jest.fn(),
    cancelPayment: jest.fn().mockResolvedValue(true),
  };

  function generateToken(userId: string, email: string, role: string): string {
    const payload = {
      sub: userId,
      email: email,
      app_metadata: {
        role: role,
      },
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const decodedSecret = Buffer.from(jwtSecret, 'base64');
    return jwt.sign(payload, decodedSecret, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT',
        kid: 'mock-test-kid',
      },
    });
  }

  beforeAll(async () => {
    // Darle tiempo a las conexiones previas de Jest para cerrarse y evitar la saturación del pool
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MercadoPagoService)
      .useValue(mockMercadoPagoService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    config = app.get(ConfigService);
    jwtSecret = config.get<string>('SUPABASE_JWT_SECRET') || '';

    // 1. Obtener/Crear Nodos y Productos para pruebas
    product = await prisma.productos.findFirst();
    if (!product) {
      product = await prisma.productos.create({
        data: {
          name: 'Producto Test Admin',
          price: 10.0,
          bulk_size: 2,
          stock: 10,
        },
      });
    }

    const existingNodes = await prisma.nodos.findMany({ take: 2 });
    if (existingNodes.length >= 2) {
      nodeA = existingNodes[0];
      nodeB = existingNodes[1];
    } else {
      nodeA = await prisma.nodos.create({
        data: { name: 'Nodo Test A', address: 'Calle A 123', manager_name: 'Coordinador A' },
      });
      nodeB = await prisma.nodos.create({
        data: { name: 'Nodo Test B', address: 'Calle B 456', manager_name: 'Coordinador B' },
      });
    }

    // 2. Obtener/Crear perfiles para testing
    // Encontrar perfiles reales para evitar crear usuarios de auth huérfanos
    const profiles = await prisma.profiles.findMany({ take: 3 });
    if (profiles.length >= 3) {
      adminUser = profiles[0];
      nodoAUser = profiles[1];
      nodoBUser = profiles[2];
    } else {
      throw new Error('Se requieren al menos 3 perfiles en la DB para ejecutar este E2E.');
    }

    // Guardar estados originales para restauración
    await prisma.profiles.update({
      where: { id: adminUser.id },
      data: { role: 'ADMIN' },
    });
    await prisma.profiles.update({
      where: { id: nodoAUser.id },
      data: { role: 'NODO', default_node_id: nodeA.id },
    });
    await prisma.profiles.update({
      where: { id: nodoBUser.id },
      data: { role: 'NODO', default_node_id: nodeB.id },
    });

    // Generar tokens
    adminToken = generateToken(adminUser.id, adminUser.email, 'ADMIN');
    nodoAToken = generateToken(nodoAUser.id, nodoAUser.email, 'NODO');
    nodoBToken = generateToken(nodoBUser.id, nodoBUser.email, 'NODO');

    // 3. Crear grupos de compra para pruebas
    groupNodeA = await prisma.buy_groups.create({
      data: {
        product_id: product.id,
        node_id: nodeA.id,
        status: 'SHIPPED',
        target_size: 2,
      },
    });

    groupNodeB = await prisma.buy_groups.create({
      data: {
        product_id: product.id,
        node_id: nodeB.id,
        status: 'SHIPPED',
        target_size: 2,
      },
    });
  });

  afterAll(async () => {
    // Limpieza de grupos creados
    await prisma.group_orders.deleteMany({
      where: { group_id: { in: [groupNodeA.id, groupNodeB.id] } },
    });
    await prisma.buy_groups.deleteMany({
      where: { id: { in: [groupNodeA.id, groupNodeB.id] } },
    });

    await app.close();
  });

  describe('GET /buy-groups (Filtrado y seguridad)', () => {
    it('debería permitir al ADMIN listar todos los grupos de todos los nodos', async () => {
      const res = await request(app.getHttpServer())
        .get('/buy-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('debería restringir al Coordinador de Nodo A a ver solo sus grupos', async () => {
      const res = await request(app.getHttpServer())
        .get('/buy-groups')
        .set('Authorization', `Bearer ${nodoAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Validar que ninguno de los grupos devueltos pertenezca a nodeB
      res.body.forEach((group: any) => {
        expect(group.nodeId).toBe(nodeA.id);
        expect(group.nodeId).not.toBe(nodeB.id);
      });
    });
  });

  describe('PATCH /buy-groups/:id/status (Máquina de estados y seguridad)', () => {
    it('debería permitir al Coordinador de Nodo A actualizar su grupo a READY_FOR_PICKUP', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/buy-groups/${groupNodeA.id}/status`)
        .set('Authorization', `Bearer ${nodoAToken}`)
        .send({ status: 'READY_FOR_PICKUP' })
        .expect(200);

      expect(res.body.status).toBe('READY_FOR_PICKUP');
    });

    it('debería prohibir al Coordinador de Nodo A actualizar el grupo del Nodo B', async () => {
      await request(app.getHttpServer())
        .patch(`/buy-groups/${groupNodeB.id}/status`)
        .set('Authorization', `Bearer ${nodoAToken}`)
        .send({ status: 'READY_FOR_PICKUP' })
        .expect(403);
    });

    it('debería prohibir al Coordinador de Nodo A actualizar a un estado no permitido (ej: CANCELLED)', async () => {
      await request(app.getHttpServer())
        .patch(`/buy-groups/${groupNodeA.id}/status`)
        .set('Authorization', `Bearer ${nodoAToken}`)
        .send({ status: 'CANCELLED' })
        .expect(403);
    });

    it('debería permitir al ADMIN cancelar cualquier grupo y disparar cancelPayment', async () => {
      // Crear orden de prueba en PAYMENT_HELD para verificar el flujo de liberación de fondos
      const testOrder = await prisma.group_orders.create({
        data: {
          group_id: groupNodeA.id,
          profile_id: adminUser.id,
          quantity: 1,
          unit_price: 10.0,
          status: 'PAYMENT_HELD',
          payment_intent_id: 'test_held_payment_123',
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/buy-groups/${groupNodeA.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');

      // Validar que se llamó a Mercado Pago para cancelar la pre-autorización
      expect(mockMercadoPagoService.cancelPayment).toHaveBeenCalledWith('test_held_payment_123');

      // Validar que la orden en DB cambió a CANCELLED
      const orderInDb = await prisma.group_orders.findUnique({
        where: { id: testOrder.id },
      });
      expect(orderInDb?.status).toBe('CANCELLED');
    });
  });
});
