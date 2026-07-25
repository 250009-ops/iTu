import { ArrayUnique, IsArray, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteAdminDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions!: string[];
}
