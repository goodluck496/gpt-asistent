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
import { MessageEntity } from '../database/message.entity';
import { FindOptionsOrder } from 'typeorm/find-options/FindOptionsOrder';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(TelegramUserSessionEntity)
        private sessionRepo: Repository<TelegramUserSessionEntity>,
        @InjectRepository(TelegramUserSessionOptionsEntity)
        private sessionOptionRepo: Repository<TelegramUserSessionOptionsEntity>,
        @InjectRepository(MessageEntity)
        private messageRepo: Repository<MessageEntity>,
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
        return this.sessionOptionRepo.findBy({ sessionId: sessionId });
    }

    getOption(sessionId: number, key: SessionOptionKeys): Promise<TelegramUserSessionOptionsEntity | undefined> {
        return this.sessionOptionRepo
            .findBy({
                sessionId,
                key,
            })
            .then((values) => values[0]);
    }

    saveMessages(sessonId: number, messages: Partial<MessageEntity>[]): Promise<MessageEntity[]> {
        return this.messageRepo.save(
            messages.map((el) =>
                this.messageRepo.create({
                    ...el,
                }),
            ),
        );
    }

    getMessagesForSession(
        sessionId,
        where: FindOptionsWhere<MessageEntity>,
        order: FindOptionsOrder<MessageEntity>,
    ): Promise<MessageEntity[]> {
        return this.messageRepo.find({
            where: {
                ...where,
                sessionId,
            },
            order,
        });
    }

    async resetSession(tgUserId: number, userId: number): Promise<void> {
        const session = await this.getActiveSessionByChatId(tgUserId);
        if (session) {
            void this.sessionRepo.update(session.id, { isActive: false });
        }

        await this.sessionRepo.save(
            this.sessionRepo.create({
                userId,
                tgUserId: tgUserId,
                chatId: tgUserId,
                isActive: true,
            }),
        );
    }

    private getValueType(value: unknown): SessionOptionTypes {
        const isValidDate = typeof value === 'string' && moment(value).isValid();
        if (isValidDate) {
            return 'date';
        }
        return typeof value;
    }
}
