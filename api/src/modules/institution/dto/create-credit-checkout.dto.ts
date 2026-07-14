import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCreditCheckoutDto {
  /** Pack id from CREDIT_PACKS (starter | growth | pro). */
  @IsString()
  @IsNotEmpty()
  packId: string;
}
