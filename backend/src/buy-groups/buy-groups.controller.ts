import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BuyGroupsService } from './buy-groups.service';
import { JoinGroupDto } from './dto/join-group.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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
  constructor(private readonly buyGroupsService: BuyGroupsService) {}

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
}
