import { Injectable } from '@nestjs/common';
import { ITextToVoiceParams, ITextToVoiceService, IVoiceModel } from '../voice.const-and-types';
import axios, { AxiosRequestConfig } from 'axios';

interface IPaperTTSRequestPayload {
    text: string;
    modelName: string;
}

@Injectable()
export class PiperTextToVoiceService implements ITextToVoiceService {
    API_URL = 'http://tts-piper-service:5002';

    public async getModels(): Promise<IVoiceModel[]> {
        const response = await axios.get(`${this.API_URL}/api/tts/models`);

        return response.data;
    }

    async textToSpeech(text: string, params: Partial<ITextToVoiceParams>): Promise<Buffer | undefined> {
        const options: AxiosRequestConfig<IPaperTTSRequestPayload> = {
            method: 'POST',
            url: this.API_URL + '/api/tts',
            responseType: 'arraybuffer',
            data: {
                text,
                modelName: params.model,
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
