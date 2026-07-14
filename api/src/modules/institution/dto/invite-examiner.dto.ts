import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class InviteExaminerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsIn(['WRITING', 'SPEAKING', 'BOTH'])
  speciality: 'WRITING' | 'SPEAKING' | 'BOTH';
}
