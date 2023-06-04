import { Injectable } from '@nestjs/common';
import { IVoiceApiService } from '../voice.const-and-types';
import axios, { AxiosRequestConfig } from 'axios';
import * as config from 'config';

const VOICE_RSS_TOKEN: string = config.get('VOICE_RSS_TOKEN');

@Injectable()
export class VoiceRssService implements IVoiceApiService {
    config: any = {
        LANGUAGE: 'ru-ru',
        FILE_EXT: 'MP3',
        AUDIO_FORMAT: '16khz_16bit_stereo',
        RATE: '0',
        VOICE_NAME: 'Marina',
    };

    API_URL = 'http://api.voicerss.org';

    /**
     * @deprecated
     * @param data
     * У данного API отсутвует декодирование голоса в текст
     */
    speechToText(data: Buffer): Promise<string> {
        return Promise.resolve('');
    }

    async textToSpeech(text: string): Promise<Buffer | undefined> {
        const params = this.getParamsForSend(text);

        const options: AxiosRequestConfig = {
            method: 'GET',
            url: this.API_URL,
            responseType: 'arraybuffer',
            params,
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

    getParamsForSend(text: string): URLSearchParams {
        const encodedParams = new URLSearchParams();
        encodedParams.set('key', VOICE_RSS_TOKEN);
        encodedParams.set('hl', this.config.LANGUAGE);
        encodedParams.set('r', this.config.RATE);
        encodedParams.set('c', this.config.FILE_EXT);
        // encodedParams.set('ssml', 'true');
        encodedParams.set('v', this.config.VOICE_NAME);
        encodedParams.set('f', this.config.AUDIO_FORMAT);
        encodedParams.set('src', text);

        return encodedParams;
    }
}
