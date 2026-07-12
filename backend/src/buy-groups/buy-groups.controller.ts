import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BuyGroupsService } from './buy-groups.service';
import { BuyGroupsCronService } from './buy-groups-cron.service';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateGroupStatusDto } from './dto/update-group-status.dto';
import { ConsolidateGroupsDto } from './dto/consolidate-groups.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('buy-groups')
@Controller('buy-groups')
export class BuyGroupsController {
  constructor(
    private readonly buyGroupsService: BuyGroupsService,
    private readonly cronService: BuyGroupsCronService,
    private readonly prisma: PrismaService,
  ) { }

  @Get('active')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE')
  @ApiOperation({ summary: 'Obtener grupos de compra activos para un nodo' })
  @ApiQuery({
    name: 'nodeId',
    type: 'string',
    required: true,
    description: 'ID del nodo de retiro',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de grupos activos obtenida correctamente.',
  })
  @ApiResponse({ status: 400, description: 'ID del nodo ausente o inválido.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async getActiveGroups(@Query('nodeId') nodeId: string) {
    if (!nodeId) {
      throw new BadRequestException('El parámetro nodeId es requerido.');
    }
    return this.buyGroupsService.getActiveGroups(nodeId);
  }

  @Post('join')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE')
  @ApiOperation({ summary: 'Sumarse o iniciar un grupo de compra colectiva' })
  @ApiResponse({
    status: 201,
    description: 'Pedido registrado correctamente en el grupo.',
  })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido o error en la base de datos.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async joinGroup(@Req() req: any, @Body() joinGroupDto: JoinGroupDto) {
    return this.buyGroupsService.joinOrCreateGroup(req.user.id, joinGroupDto);
  }

  @Get('my-orders')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE')
  @ApiOperation({ summary: 'Obtener los pedidos del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Historial de compras obtenido correctamente.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async getMyOrders(@Req() req: any) {
    return this.buyGroupsService.getMyOrders(req.user.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'NODO')
  @ApiOperation({ summary: 'Listar y filtrar grupos de compra dinámicamente' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'nodeId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de grupos obtenida correctamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  async getFilteredGroups(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('nodeId') nodeId?: string,
    @Query('productId') productId?: string,
  ) {
    const filters: { status?: string; nodeId?: string; productId?: string } = {
      status,
      nodeId,
      productId,
    };

    // Aislamiento de seguridad: si es rol NODO, forzar el filtro a su propio default_node_id
    if (req.user.role === 'NODO') {
      const profile = await this.prisma.profiles.findUnique({
        where: { id: req.user.id },
        select: { default_node_id: true },
      });
      if (!profile || !profile.default_node_id) {
        throw new ForbiddenException('El Coordinador de Nodo no posee un nodo asignado en su perfil.');
      }
      filters.nodeId = profile.default_node_id;
    }

    return this.buyGroupsService.findFiltered(filters);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'NODO')
  @ApiOperation({ summary: 'Actualizar estado de un grupo de compra (flujo logístico)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado correctamente.' })
  @ApiResponse({ status: 400, description: 'Error al cambiar de estado.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateGroupStatusDto,
  ) {
    // Aislamiento de seguridad: si es rol NODO, validar pertenencia del bulto y transiciones permitidas
    if (req.user.role === 'NODO') {
      const profile = await this.prisma.profiles.findUnique({
        where: { id: req.user.id },
        select: { default_node_id: true },
      });
      if (!profile || !profile.default_node_id) {
        throw new ForbiddenException('El Coordinador de Nodo no posee un nodo asignado en su perfil.');
      }

      const group = await this.prisma.buy_groups.findUnique({
        where: { id },
        select: { node_id: true },
      });
      if (!group) {
        throw new BadRequestException('El grupo de compra especificado no existe.');
      }

      if (group.node_id !== profile.default_node_id) {
        throw new ForbiddenException('No tiene permisos para modificar grupos de otros nodos.');
      }

      // Restricción de máquina de estados para NODO (marcar como recibido en nodo, o entregado al cliente)
      const allowedNodoStatuses = ['READY_FOR_PICKUP', 'FINALIZED'];
      if (!allowedNodoStatuses.includes(updateDto.status)) {
        throw new ForbiddenException(
          `Un Coordinador de Nodo sólo puede actualizar estados a: ${allowedNodoStatuses.join(', ')}`,
        );
      }
    }

    return this.buyGroupsService.updateStatus(id, updateDto.status);
  }

  @Post('consolidate')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'NODO')
  @ApiOperation({ summary: 'Consolidar grupos COMPLETED en un nodo y pasarlos a PROCESSING_ORDER' })
  @ApiResponse({
    status: 201,
    description: 'Grupos consolidados con éxito y pasados a PROCESSING_ORDER.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o sin grupos COMPLETED.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  async consolidateGroups(@Req() req: any, @Body() dto: ConsolidateGroupsDto) {
    return this.buyGroupsService.consolidateGroups(req.user.id, req.user.role, dto);
  }

  @Post('test-cron')
  @ApiOperation({ summary: 'Ejecutar manualmente el Cron Job de expiración (Dev/Testing)' })
  async triggerCron() {
    await this.cronService.handleExpiration();
    return { success: true, message: 'Cron Job de expiración ejecutado con éxito.' };
  }
}
