import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-user';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterTeacherDto } from './dto/register-teacher.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DisableTotpDto, EnableTotpDto } from './dto/totp.dto';

const MAX_CERT_BYTES = 10 * 1024 * 1024;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('register-teacher')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'certificates', maxCount: 5 }], {
      storage: memoryStorage(),
      limits: { fileSize: MAX_CERT_BYTES },
    }),
  )
  registerTeacher(
    @Body() dto: RegisterTeacherDto,
    @UploadedFiles()
    files: { certificates?: Express.Multer.File[] },
  ) {
    return this.authService.registerTeacher(
      dto,
      files?.certificates ?? [],
    );
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.id);
  }

  @ApiBearerAuth()
  @Post('change-password')
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @ApiBearerAuth()
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser() user: RequestUser) {
    return this.authService.setupTwoFactor(user.id);
  }

  @ApiBearerAuth()
  @Post('2fa/enable')
  enableTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body() dto: EnableTotpDto,
  ) {
    return this.authService.enableTwoFactor(user.id, dto);
  }

  @ApiBearerAuth()
  @Post('2fa/disable')
  disableTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body() dto: DisableTotpDto,
  ) {
    return this.authService.disableTwoFactor(user.id, dto);
  }
}
