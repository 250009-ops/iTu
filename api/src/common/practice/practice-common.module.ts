import { Global, Module } from '@nestjs/common';
import { PracticeWalletService } from './practice-wallet.service';

@Global()
@Module({
  providers: [PracticeWalletService],
  exports: [PracticeWalletService],
})
export class PracticeCommonModule {}
