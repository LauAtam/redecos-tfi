import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { RolesGuard } from '../supabase/roles.guard';
import { Roles } from '../supabase/roles.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

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
}
