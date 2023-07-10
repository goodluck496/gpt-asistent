import { Injectable } from '@nestjs/common';
import { IVoiceApiService } from '../voice.const-and-types';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class PiperTextToVoiceService implements IVoiceApiService {
    API_URL = 'http://tts-piper-service:5002';

    async textToSpeech(text: string): Promise<Buffer | undefined> {
        const options: AxiosRequestConfig = {
            method: 'POST',
            url: this.API_URL + '/api/tts',
            responseType: 'arraybuffer',
            data: {
                text,
                modelName: 'voice-ru-denis-medium',
            },
        };

        try {
            const response = await axios.request(options);
            return Buffer.from(response.data, 'binary');
        } catch (error) {
            console.error('error', error);
            return undefined;
        }

        return Promise.resolve(undefined);
    }
}
