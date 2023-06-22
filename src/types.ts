export enum TELEGRAM_ACTION_TYPES {
    COMMAND = 'command',
    EVENT = 'event',
    SCENARIO = 'scenario',
}

export interface IBaseTelegramActionEntity {
    name: string;
    type: TELEGRAM_ACTION_TYPES;

    registrationHandler(): void;
}
