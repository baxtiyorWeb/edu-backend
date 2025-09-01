import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from 'src/user/entity/user.entity';
import { OtpService } from './otp-service';
import {
  LoginDto,
  LoginVerifyOtpDto,
  SetNameDto,
  SetRoleDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { ROLE } from '../../src/enum';

// Map step numbers to human-readable names for better communication
const stepNames: Record<number, string> = {
  1: 'Send OTP',
  2: 'Verify OTP',
  3: 'Set Name',
  4: 'Set Role',
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  /** 🔑 Login User: Sends OTP for verification */
  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });

    // Send OTP regardless of user's registration status for security
    const otp = await this.otpService.sendOtp(dto.phone);

    if (!user) {
      // New user registration flow
      const newUser = this.userRepo.create({
        phone: dto.phone,
        code: otp,
        isVerified: false,
        step: 1,
        role: ROLE.USER,
      });
      await this.userRepo.save(newUser);

      return {
        requiresOtp: true,
        message: 'OTP sent. Please verify to continue registration.',
        step: 1,
      };
    } else {
      // Existing user (either complete or incomplete registration)
      user.code = otp;
      user.isVerified = false; // Reset verification status for security
      await this.userRepo.save(user);

      const pendingStepName = stepNames[user.step] ?? 'Unknown step';
      return {
        requiresOtp: true,
        message: `OTP sent to your phone. Pending step: ${pendingStepName}`,
        step: user.step,
      };
    }
  }

  /** 🔑 Verify OTP for Login and generate tokens */
  async verifyLoginOtp(dto: LoginVerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (user.code !== dto.code) {
      throw new BadRequestException('Invalid OTP.');
    }

    user.isVerified = true;
    await this.userRepo.save(user);

    // If registration is complete, return tokens
    if (user.step === 4) {
      const tokens = await this.generateTokens(user);
      return {
        message: 'Login successful.',
        user: {
          id: user.id,
          phone: user.phone,
          username: user.username,
          lastname: user.lastname,
          isVerified: user.isVerified,
          role: user.role,
        },
        tokens,
      };
    } else {
      // If registration is incomplete, return the next step info
      return {
        message: `OTP verified. Pending step: ${stepNames[user.step] ?? 'Unknown'}`,
        step: user.step,
      };
    }
  }

  /** 1️⃣ Send OTP for registration */
  async sendOtp(phone: string) {
    const user = await this.userRepo.findOne({ where: { phone } });
    if (user && user.step === 4) {
      throw new BadRequestException('User is already registered.');
    }

    const otp = await this.otpService.sendOtp(phone);
    if (!user) {
      const newUser = this.userRepo.create({
        phone,
        code: otp,
        isVerified: false,
        step: 1,
        role: ROLE.USER,
      });
      await this.userRepo.save(newUser);
      return {
        message: 'OTP sent successfully for new registration.',
        step: 1,
      };
    } else {
      user.code = otp;
      user.isVerified = false;
      await this.userRepo.save(user);
      return { message: 'OTP resent.', step: user.step };
    }
  }

  /** 2️⃣ Verify OTP */
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (user.code !== dto.code) {
      throw new BadRequestException('Invalid OTP.');
    }
    if (user.step !== 1) {
      throw new BadRequestException('Wrong step. You are at step ' + user.step);
    }

    user.isVerified = true;
    user.step = 2;
    await this.userRepo.save(user);

    return { message: 'OTP verified, proceed to set name.', step: user.step };
  }

  /** 3️⃣ Set Name */
  async setName(dto: SetNameDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (user.step !== 2) {
      throw new BadRequestException(
        'Wrong step. Complete OTP verification first.',
      );
    }

    user.username = dto.username;
    user.lastname = dto.lastname;
    user.step = 3;
    await this.userRepo.save(user);

    return { message: 'Name saved, proceed to set role.', step: user.step };
  }

  /** 4️⃣ Set Role & Finish Registration */
  async setRole(dto: SetRoleDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (user.step !== 3) {
      throw new BadRequestException(
        'Wrong step. Complete previous steps first.',
      );
    }

    if (dto.role === ROLE.ADMIN) {
      const adminCount = await this.userRepo.count({
        where: { role: ROLE.ADMIN },
      });
      if (adminCount >= 3) {
        throw new BadRequestException('Maximum of 3 admins allowed.');
      }
    }

    if (
      user.role !== ROLE.USER &&
      [ROLE.STUDENT, ROLE.TEACHER].includes(dto.role)
    ) {
      throw new BadRequestException(
        'Only a USER can be upgraded to STUDENT or TEACHER.',
      );
    }

    user.role = dto.role;
    user.step = 4;
    await this.userRepo.save(user);

    const tokens = await this.generateTokens(user);

    return { message: 'Role set and registration complete.', user, tokens };
  }

  /** 🔍 Check if phone is registered & find current step */
  async checkPhone(phone: string) {
    const user = await this.userRepo.findOne({ where: { phone } });
    if (!user) return { registered: false };
    return { registered: true, step: user.step };
  }

  /** 🔄 Refresh Token */
  async refreshToken(refreshToken: string) {
    try {
      const payload = (await this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      })) as {
        sub: string;
        phone: string;
        role: ROLE;
        username: string;
        lastname: string;
      };

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new BadRequestException('User not found.');
      }
      if (user.step !== 4) {
        throw new BadRequestException('Registration not complete.');
      }

      return this.generateTokens(user);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  /** 🔑 Generate Access + Refresh Tokens */
  async generateTokens(user: UserEntity) {
    if (!this.jwtService) {
      throw new InternalServerErrorException('JwtService not initialized.');
    }

    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      username: user.username,
      lastname: user.lastname,
    };

    const accessToken = (await this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
    })) as string;

    const refreshToken = (await this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    })) as string;

    return { accessToken, refreshToken };
  }
}
