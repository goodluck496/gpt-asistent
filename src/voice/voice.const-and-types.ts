export interface IVoiceApiService {
    textToSpeech(text: string): Promise<Buffer | undefined>;

    speechToText(blob: Buffer): Promise<string>;
}

export const VOICE_API_SERVICE_TOKEN = 'VOICE_API_SERVICE_TOKEN';
