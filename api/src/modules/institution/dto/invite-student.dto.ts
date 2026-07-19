import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}
