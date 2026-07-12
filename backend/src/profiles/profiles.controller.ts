import { Controller, Patch, Body, Req, UseGuards, Get, Post, Delete, Param } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddCardDto } from './dto/add-card.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) { }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE', 'NODO')
  @ApiOperation({ summary: "Get current user's profile" })
  @ApiResponse({
    status: 200,
    description: 'The profile has been successfully retrieved.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@Req() req: any) {
    return this.profilesService.getProfile(req.user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE', 'NODO')
  @ApiOperation({ summary: "Update current user's profile" })
  @ApiResponse({
    status: 200,
    description: 'The profile has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(req.user.id, updateProfileDto);
  }

  @Get('cards')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE')
  @ApiOperation({ summary: "Get current user's saved cards" })
  @ApiResponse({
    status: 200,
    description: 'List of saved cards.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async listCards(@Req() req: any) {
    return this.profilesService.listCards(req.user.id);
  }

  @Post('cards')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE')
  @ApiOperation({ summary: "Save a new card for the current user" })
  @ApiResponse({
    status: 201,
    description: 'The card has been successfully saved.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async addCard(
    @Req() req: any,
    @Body() addCardDto: AddCardDto,
  ) {
    return this.profilesService.addCard(req.user.id, addCardDto.token);
  }

  @Delete('cards/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLIENTE')
  @ApiOperation({ summary: "Delete a saved card" })
  @ApiResponse({
    status: 200,
    description: 'The card has been successfully deleted.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async deleteCard(
    @Req() req: any,
    @Param('id') cardId: string,
  ) {
    return this.profilesService.deleteCard(req.user.id, cardId);
  }
}
