import { Injectable } from '@nestjs/common';
import { SessionOptionKeys, TelegramUserSessionOptionsEntity } from '../database/telegram-user-session-options.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(TelegramUserSessionEntity)
        private sessionRepo: Repository<TelegramUserSessionEntity>,
        @InjectRepository(TelegramUserSessionOptionsEntity)
        private sessionOptionRepo: Repository<TelegramUserSessionOptionsEntity>,
    ) {}

    addAndUpdateOption(sessionId: number, key: SessionOptionKeys, value: string): Promise<TelegramUserSessionOptionsEntity> {
        return;
    }

    deleteOption(): Promise<boolean> {
        return Promise.resolve(false);
    }

    getOption(sessionId: number, key: SessionOptionKeys): Promise<TelegramUserSessionOptionsEntity | undefined> {
        return this.sessionOptionRepo
            .findBy({
                sessionId,
                key,
            })
            .then((values) => values[0]);
    }
}
