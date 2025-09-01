import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ROLE } from 'src/enum';

export class UserDto {
  @ApiProperty({
    required: true,
    example: 'xxxxx-xxxx--xxx-xxxx',
    description: 'user id',
  })
  @IsString()
  @IsNotEmpty()
  id?: string;

  @ApiProperty({ required: true, example: 'Baxtiyor' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ required: true, example: 'Qurbonnazarov' })
  @IsString()
  @IsNotEmpty()
  lastname!: string;

  @ApiProperty({ required: true, example: '+998910184880' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsEnum(ROLE, {
    message: 'role must be one of USER | ADMIN | STUDENT | TEACHER',
  })
  role!: string;
}
