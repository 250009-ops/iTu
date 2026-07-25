import { IsNotEmpty, IsString } from 'class-validator';

export class SkipMockFeedbackDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;
}
