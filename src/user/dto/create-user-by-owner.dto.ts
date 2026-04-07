import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../prisma/generated/prisma/enums';

export class CreateUserByOwnerDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}
