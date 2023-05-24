import { TelegramUserSessionEntity } from 'src/database/telegram-user-session-entity';
import { TelegramUserEntity } from 'src/database/telegram-user.entity';
import { TelegramBotService } from '../telegram-bot.module';

export enum Events {
    TEXT = 'text',
    VOICE = 'voice',
}

export interface IBaseEvent {
    event: Events;

    handle(): void;
}
