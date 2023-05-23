import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TelegramUserSessionEntity } from './telegram-user-session-entity';

@Entity()
export class TelegramUserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 500, nullable: false })
    name: string;

    @Column({ name: 'telegram_user_id', nullable: false })
    telegramUserId: number;

    @Column({ name: 'first_name', nullable: true })
    firstName: string;

    @Column({ name: 'second_name', nullable: true })
    secondName: string;

    @OneToMany(() => TelegramUserSessionEntity, (session) => session.user)
    sessions?: TelegramUserSessionEntity[];
}
