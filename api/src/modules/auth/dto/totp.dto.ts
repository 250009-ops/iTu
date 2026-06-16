import { IsNotEmpty, IsString, Length } from 'class-validator';

export class EnableTotpDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class DisableTotpDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
