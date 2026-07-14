import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class JoinCenterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;
}
