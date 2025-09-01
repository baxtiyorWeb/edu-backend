import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}
  async getAllUsers() {
    const users = await this.userRepo.find();

    const sanitizedUsers = users.map((user) => {
      const {
        id,
        phone,
        username,
        lastname,
        isVerified,
        role,
        createdAt,
        updatedAt,
        step,
        // step va code bu yerda olinmaydi
      } = user;

      return {
        id,
        phone,
        username,
        lastname,
        isVerified,
        role,
        step,
        createdAt,
        updatedAt,
      };
    });

    return {
      data: {
        users: sanitizedUsers,
      },
      message: 'Users retrieved successfully',
      statusCode: 200,
    };
  }
}
