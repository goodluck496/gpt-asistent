import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TelegramUserEntity } from './telegram-user.entity';
import { MessageEntity } from './message.entity';

@Entity()
export class TelegramUserSessionEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => TelegramUserEntity, (user) => user.sessions, { lazy: true })
    user: TelegramUserEntity;

    @OneToMany(() => MessageEntity, (m) => m.session)
    messages: MessageEntity[];

    @Column({ name: 'is_active', default: false })
    isActive: boolean;

    @Column({ name: 'gpt_enable', default: false })
    gptEnable: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
