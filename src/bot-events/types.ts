export enum Events {
    TEXT = 'text',
    VOICE = 'voice',
}

export interface IBaseEvent {
    event: Events;

    handle(): void;
}
