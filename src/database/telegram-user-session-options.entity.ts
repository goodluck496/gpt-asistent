import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TelegramUserSessionEntity } from './telegram-user-session-entity';

export enum SessionOptionKeys {
    GPT_ENABLE = 'gpt-enable',
    GPT_SYSTEM_MSG = 'gpt-system-msg',
    GPT_MODEL = 'gpt-model',
    VOICE_ENABLE = 'voice-enable',
    VOICE_SEX = 'voice-sex',
}

export type SessionOptionTypes = 'string' | 'number' | 'boolean' | 'date' | 'object' | string;

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
    type: SessionOptionTypes;

    @Column()
    value: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
