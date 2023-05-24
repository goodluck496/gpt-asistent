import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TelegramUserSessionEntity } from './telegram-user-session-entity';

@Entity()
export class MessageEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    gptAnswer: boolean;

    @Column({ type: 'text' })
    text: string;

    @Column({ nullable: true })
    sessionId: number;

    @ManyToOne(() => TelegramUserSessionEntity, (us) => us.id)
    session: TelegramUserSessionEntity;

    @CreateDateColumn()
    createdAt: Date;
}
