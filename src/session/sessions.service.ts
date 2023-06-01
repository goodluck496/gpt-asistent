import { Injectable } from '@nestjs/common';
import {
    SessionOptionKeys,
    SessionOptionTypes,
    TelegramUserSessionOptionsEntity,
} from '../database/telegram-user-session-options.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import * as moment from 'moment';

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(TelegramUserSessionEntity)
        private sessionRepo: Repository<TelegramUserSessionEntity>,
        @InjectRepository(TelegramUserSessionOptionsEntity)
        private sessionOptionRepo: Repository<TelegramUserSessionOptionsEntity>,
    ) {}

    getActiveSessionByChatId(chatId: number): Promise<TelegramUserSessionEntity> {
        return this.sessionRepo.findOne({ where: { chatId, isActive: true }, relations: { options: true } });
    }

    async addAndUpdateOption(
        sessionId: number,
        key: SessionOptionKeys,
        type: SessionOptionTypes,
        value: string | unknown,
    ): Promise<TelegramUserSessionOptionsEntity> {
        const valueString = String(value);
        const existOption = await this.getOption(sessionId, key);

        if (existOption) {
            return this.sessionOptionRepo.update({ id: existOption.id }, { type, value: valueString }).then(() => {
                return this.sessionOptionRepo.create({ ...existOption, type, value: valueString });
            });
        }

        const newOption = this.sessionOptionRepo.create({
            sessionId,
            key,
            type: this.getValueType(value),
            value: valueString,
        });
        const savedOption = await this.sessionOptionRepo.save(newOption);

        return savedOption;
    }

    deleteOption(sessionId: number, key: SessionOptionKeys): Promise<DeleteResult> {
        return this.sessionOptionRepo.delete({ sessionId, key });
    }

    getSessionOptions(sessionId: number): Promise<TelegramUserSessionOptionsEntity[]> {
        return this.sessionOptionRepo.findBy({ id: sessionId });
    }

    getOption(sessionId: number, key: SessionOptionKeys): Promise<TelegramUserSessionOptionsEntity | undefined> {
        return this.sessionOptionRepo
            .findBy({
                sessionId,
                key,
            })
            .then((values) => values[0]);
    }

    private getValueType(value: unknown): SessionOptionTypes {
        const isValidDate = typeof value === 'string' && moment(value).isValid();
        if (isValidDate) {
            return 'date';
        }
        return typeof value;
    }
}
