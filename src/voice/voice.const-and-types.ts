import { connection } from 'websocket';

export interface IVoiceToTextService {
    speechToText(filePath: string): Promise<string>;
}

export interface IVoiceApiService {
    textToSpeech(text: string): Promise<Buffer | undefined>;
}

export const TEXT_TO_VOICE_SERVICE_TOKEN = 'TEXT_TO_VOICE_SERVICE_TOKEN';

export const VOICE_TO_TEXT_SERVICE_TOKEN = 'VOICE_TO_TEXT_SERVICE_TOKEN';

export type WSConnection = {
    connection: connection;
    id: string;
};
