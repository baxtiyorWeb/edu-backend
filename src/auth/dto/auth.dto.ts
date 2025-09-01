// dto/send-otp.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ROLE } from 'src/enum';

export class SendOtpDto {
  @ApiProperty({ example: '+998910184880' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

// dto/verify-otp.dto.ts

export class VerifyOtpDto {
  @ApiProperty({ example: '+998910184880' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

// dto/set-name.dto.ts

export class SetNameDto {
  @ApiProperty({ example: '+998910184880' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'Baxtiyor' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'Qurbonnazarov' })
  @IsString()
  @IsNotEmpty()
  lastname!: string;
}

// dto/set-role.dto.ts

export class SetRoleDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: '+998910184880' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ enum: ROLE })
  @IsEnum(ROLE)
  @IsNotEmpty()
  role!: ROLE;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LoginDto {
  @ApiProperty({ description: 'User phone number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class CheckPhoneDto {
  @ApiProperty({ description: 'User phone number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class LoginVerifyOtpDto {
  @ApiProperty({ description: 'User phone number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'OTP code sent to phone' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
