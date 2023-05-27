import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TelegramUserSessionEntity } from './telegram-user-session-entity';

export enum SessionOptionKeys {}

@Entity()
export class TelegramUserSessionOptionsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => TelegramUserSessionEntity, (ts) => ts.options)
    session: TelegramUserSessionEntity;

    @Column()
    key: SessionOptionKeys;

    @Column()
    value: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
