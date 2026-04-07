import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserByOwnerDto } from './dto/create-user-by-owner.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../prisma/generated/prisma/enums';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateUserByOwnerDto) {
    return this.userService.create(dto);
  }
}
