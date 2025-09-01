import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auth')
export class AuthEntity {
  // Define your entity properties and columns here
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  phone!: string;
  @Column()
  code!: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  lastname?: string;

  @Column({
    type: 'enum',
    enum: ['USER', 'ADMIN', 'STUDENT', 'TEACHER'],
    default: 'USER',
  })
  role!: 'USER' | 'ADMIN' | 'STUDENT' | 'TEACHER';
}
