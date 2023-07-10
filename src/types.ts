import { Context, NarrowedContext } from 'telegraf';
import { Update } from 'typegram/update';

export enum TELEGRAM_ACTION_TYPES {
    COMMAND = 'command',
    EVENT = 'event',
    SCENARIO = 'scenario',
}

export interface IBaseTelegramActionEntity {
    name: string;
    type: TELEGRAM_ACTION_TYPES;

    /**
     * В этой функции регистрируем обработчик действия (команда, событие, колл-бек на кнопку)
     */
    registrationHandler(): void;
}

export type BaseMessageContext = NarrowedContext<Context<Update>, any>;
