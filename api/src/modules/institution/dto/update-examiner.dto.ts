import { IsIn } from 'class-validator';

export class UpdateExaminerDto {
  @IsIn(['WRITING', 'SPEAKING', 'BOTH'])
  speciality: 'WRITING' | 'SPEAKING' | 'BOTH';
}
