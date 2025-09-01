import { ROLE } from 'src/enum';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string; // UUID primary key

  @Column({ unique: true })
  phone!: string; // Telefon raqam, unique

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  lastname?: string;

  @Column({ nullable: true })
  email?: string; // optional

  @Column({ nullable: true })
  password?: string; // agar parol bilan ishlash bo‘lsa

  @Column({ default: false })
  isVerified!: boolean; // OTP verify qilinganmi

  @Column({
    type: 'enum',
    enum: ROLE,
    default: ROLE.USER,
  })
  role!: ROLE;

  @Column({ nullable: true })
  code?: string; // OTP code, faqat login uchun
  @Column({ default: 1 })
  step!: number; // Step-wise registration
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
