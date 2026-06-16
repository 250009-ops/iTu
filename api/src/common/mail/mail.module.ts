import { Global, Module } from '@nestjs/common';
import { SettingsModule } from '../../modules/settings/settings.module';
import { EmailDispatchService } from './email-dispatch.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [SettingsModule],
  providers: [MailService, EmailDispatchService],
  exports: [MailService, EmailDispatchService],
})
export class MailModule {}
