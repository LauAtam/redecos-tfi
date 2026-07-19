import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('nodes')
@Controller('nodes')
export class NodesController {
  constructor(
    private readonly nodesService: NodesService,
    private readonly prisma: PrismaService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get all withdrawal nodes' })
  @ApiResponse({ status: 200, description: 'Return all nodes.' })
  findAll() {
    return this.nodesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single withdrawal node' })
  @ApiResponse({ status: 200, description: 'Return the node.' })
  @ApiResponse({ status: 404, description: 'Node not found.' })
  findOne(@Param('id') id: string) {
    return this.nodesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new withdrawal node (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'The node has been successfully created.',
  })
  create(@Body() createNodeDto: CreateNodeDto) {
    return this.nodesService.create(createNodeDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a withdrawal node (Admin only)' })
  update(@Param('id') id: string, @Body() updateNodeDto: UpdateNodeDto) {
    return this.nodesService.update(id, updateNodeDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a withdrawal node (Admin only)' })
  remove(@Param('id') id: string) {
    return this.nodesService.remove(id);
  }

  @Get(':id/dashboard-stats')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'NODO')
  @ApiOperation({ summary: 'Obtener estadísticas de consolidación del nodo' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas correctamente.' })
  @ApiResponse({ status: 403, description: 'No autorizado.' })
  async getDashboardStats(@Req() req: any, @Param('id') id: string) {
    let targetNodeId = id;

    if (req.user.role === 'NODO') {
      const profile = await this.prisma.profiles.findUnique({
        where: { id: req.user.id },
        select: { default_node_id: true },
      });

      if (!profile || !profile.default_node_id) {
        throw new ForbiddenException('El Coordinador de Nodo no posee un nodo asignado en su perfil.');
      }

      targetNodeId = profile.default_node_id;
    }

    return this.nodesService.getDashboardStats(targetNodeId);
  }

  @Post('generate-withdrawal-otp')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE')
  @ApiOperation({ summary: 'Generar código OTP para el retiro de pedidos' })
  async generateWithdrawalOtp(@Req() req: any) {
    return this.nodesService.generateWithdrawalOtp(req.user.id);
  }

  @Get('client-orders/:profileId')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'NODO')
  @ApiOperation({ summary: 'Obtener pedidos listos para retirar de un cliente en el nodo del coordinador' })
  async getClientPendingOrders(@Req() req: any, @Param('profileId') profileId: string) {
    let targetNodeId: string | null = null;

    if (req.user.role === 'NODO') {
      const profile = await this.prisma.profiles.findUnique({
        where: { id: req.user.id },
        select: { default_node_id: true },
      });

      if (!profile || !profile.default_node_id) {
        throw new ForbiddenException('El Coordinador de Nodo no posee un nodo asignado en su perfil.');
      }

      targetNodeId = profile.default_node_id;
    } else {
      const clientProfile = await this.prisma.profiles.findUnique({
        where: { id: profileId },
        select: { default_node_id: true },
      });
      targetNodeId = clientProfile?.default_node_id ?? null;
    }

    if (!targetNodeId) {
      throw new BadRequestException('No se pudo determinar el nodo de retiro.');
    }

    return this.nodesService.getClientPendingOrders(profileId, targetNodeId);
  }

  @Post('confirm-delivery')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'NODO')
  @ApiOperation({ summary: 'Confirmar la entrega física de pedidos validando el OTP' })
  async confirmDelivery(@Req() req: any, @Body() confirmDeliveryDto: ConfirmDeliveryDto) {
    return this.nodesService.confirmDelivery(
      confirmDeliveryDto.profileId,
      confirmDeliveryDto.otp,
      confirmDeliveryDto.orderIds,
      req.user.id,
    );
  }
}
