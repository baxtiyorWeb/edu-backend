import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  CheckPhoneDto,
  LoginDto,
  LoginVerifyOtpDto,
  RefreshTokenDto,
  SendOtpDto,
  SetNameDto,
  SetRoleDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { UserEntity } from 'src/user/entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  username?: string;
  lastname?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** 🔑 Login user */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user with phone and OTP' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful or OTP sent' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);

    if (result.requiresOtp) {
      return {
        statusCode: HttpStatus.OK,
        message: result.message,
        step: result.step,
        otpSent: true,
      };
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: result,
    };
  }

  /** 🔑 Verify OTP for login */
  @Post('login/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for login' })
  @ApiBody({ type: LoginVerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or user not found' })
  async verifyLoginOtp(@Body() dto: LoginVerifyOtpDto) {
    const result = await this.authService.verifyLoginOtp(dto);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
    };
  }

  /** 🔍 Check phone registration & step */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if phone is registered or not' })
  @ApiBody({ type: CheckPhoneDto })
  @ApiResponse({ status: 200, description: 'Phone check completed' })
  async checkPhone(@Body() dto: CheckPhoneDto) {
    const result = await this.authService.checkPhone(dto.phone);
    return {
      statusCode: HttpStatus.OK,
      message: 'Phone check completed',
      data: result, // { registered: true/false, step?: number }
    };
  }

  /** 🔄 Refresh Token */
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('User not found');

      if (user.step < 4) {
        throw new UnauthorizedException(
          `Registration incomplete. Current step: ${user.step}`,
        );
      }

      const tokens = await this.authService.generateTokens(user);
      return {
        statusCode: HttpStatus.OK,
        message: 'Token refreshed successfully',
        data: tokens,
      };
    } catch (err) {
      console.log(err);

      throw new UnauthorizedException('Could not refresh token');
    }
  }

  /** 1️⃣ Send OTP */
  @Post('step/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to user phone' })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  async sendOtp(@Body() dto: SendOtpDto) {
    const result = await this.authService.sendOtp(dto.phone);
    return {
      statusCode: HttpStatus.OK,
      message: 'OTP sent successfully',
      data: result,
    };
  }

  /** 2️⃣ Verify OTP */
  @Post('step/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and move to next step' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or user not found' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(dto);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      step: result.step,
    };
  }

  /** 3️⃣ Set Name */
  @Post('step/set-name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set username and lastname' })
  @ApiBody({ type: SetNameDto })
  @ApiResponse({ status: 200, description: 'Name set successfully' })
  @ApiResponse({
    status: 400,
    description: 'User not found or OTP not verified',
  })
  async setName(@Body() dto: SetNameDto) {
    const result = await this.authService.setName(dto);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      step: result.step,
    };
  }

  /** 4️⃣ Set Role & Finish Registration */
  @Post('step/set-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set user role and finish registration' })
  @ApiBody({ type: SetRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Role set and registration complete',
  })
  @ApiResponse({
    status: 400,
    description: 'User not found or previous steps incomplete',
  })
  async setRole(@Body() dto: SetRoleDto) {
    const result = await this.authService.setRole(dto);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
    };
  }
}
