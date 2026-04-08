import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../prisma/generated/prisma/enums';

export class CreateUserByOwnerDto {
  @IsEmail()
  email!: string;

  @IsString()
  displayName!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  baseRole!: Role;
}
