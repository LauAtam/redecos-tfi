import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('admin')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('admin/dashboard-stats')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get global network and dashboard stats for admin' })
  @ApiResponse({ status: 200, description: 'Stats successfully calculated and returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAdminDashboardStats() {
    return this.appService.getAdminDashboardStats();
  }
}
