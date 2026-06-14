import { IsBoolean } from 'class-validator';

export class LeaderboardConsentDto {
  @IsBoolean()
  publish: boolean;
}
