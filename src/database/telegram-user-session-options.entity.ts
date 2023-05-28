import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TelegramUserSessionEntity } from './telegram-user-session-entity';

export enum SessionOptionKeys {
    GPT_ENABLE = 'gpt-enable',
    VOICE_ENABLE = 'voice-enable',
}

@Entity()
export class TelegramUserSessionOptionsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => TelegramUserSessionEntity, (ts) => ts.options)
    session: TelegramUserSessionEntity;

    @Column()
    sessionId: number;

    @Column()
    key: SessionOptionKeys;

    @Column()
    value: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
