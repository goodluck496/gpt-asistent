import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TelegramUserEntity } from './telegram-user.entity';
import { MessageEntity } from './message.entity';
import { TelegramUserSessionOptionsEntity } from './telegram-user-session-options.entity';

@Entity()
export class TelegramUserSessionEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'chat_id', nullable: true })
    chatId: number;

    @ManyToOne(() => TelegramUserEntity, (user) => user.sessions, { lazy: true })
    user: TelegramUserEntity;

    @Column({ nullable: false })
    userId: number;

    @Column({ nullable: true })
    tgUserId: number;

    @OneToMany(() => MessageEntity, (m) => m.session)
    messages: MessageEntity[];

    @OneToMany(() => TelegramUserSessionOptionsEntity, (tso) => tso.session)
    options: TelegramUserSessionOptionsEntity[];

    @Column({ name: 'is_active', default: false })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
