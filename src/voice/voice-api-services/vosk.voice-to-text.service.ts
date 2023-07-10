import { Injectable } from '@nestjs/common';
import { IVoiceToTextService, WSConnection } from '../voice.const-and-types';
import { client, IUtf8Message } from 'websocket';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import { Reader } from 'wav';

type VoskResponseMessage = {
    result: {
        conf: string;
        end: string;
        start: string;
        word: string;
    }[];
    text: string;
};

@Injectable()
export class VoskVoiceToTextService implements IVoiceToTextService {
    WS_URL = 'ws://vtt-vosk-service:2700';

    connections: WSConnection[] = [];

    getConnection(uuid: string): WSConnection | undefined {
        return this.connections.find((el) => el.id === uuid);
    }

    speechToText(filePath: string): Promise<string> {
        return new Promise(async (res, rej) => {
            try {
                const regConn = await this.regWebsocket();
                regConn.connection.on('message', (message: IUtf8Message) => {
                    try {
                        const data: VoskResponseMessage = JSON.parse(message.utf8Data);

                        if ('text' in data) {
                            res(data.text);
                            fs.unlink(filePath, () => {
                                console.log(`Файл "${filePath}" удален`);
                            });
                            console.log('Текст который удалось распознать:');
                            console.log(data.text);
                        }
                    } catch (err) {
                        console.log('Ошибка чтения ответа от Vosk', err, message);
                    }
                    console.log('message from service', message);
                });

                const reader = new Reader();
                reader.on('format', (format) => {
                    // Получение информации о формате аудио
                    console.log('Sample Rate:', format.sampleRate);
                    console.log('Channels:', format.channels);

                    regConn.connection.send(
                        JSON.stringify({
                            config: {
                                lang: 'ru',
                                sample_rate: format.sampleRate,
                                // max_alternatives: 2,
                            },
                        }),
                    );
                });

                reader.on('data', (data) => {
                    // Обработка порции аудио-данных
                    // console.log('Получена порция данных:', data.length, 'байт', data);
                    regConn.connection.send(Buffer.from(data), (err) => console.log('err', err));
                });

                reader.on('end', () => {
                    // Завершение чтения файла
                    // РАБОТАЕТ, НЕ УДАЛЯТЬ ! но при этом результат не до конца
                    // const buff = Buffer.from(JSON.stringify({ eof: 1 } + ' \\0 '));
                    // regConn.connection.send(Buffer.from(buff), (err) => console.log('err end', err));

                    // РАБОТАЕТ, it`s LIVE!!!
                    regConn.connection.send('{"eof" : 1}', (err) => console.log('err end', err));

                    console.log('Чтение файла завершено');
                });

                reader.on('error', (error) => {
                    rej({
                        title: 'Ошибка чтения файла',
                        error: error,
                    });
                });

                // Чтение wav-файла порциями
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(reader);
            } catch (err) {
                rej({
                    title: 'Произошла ошибка подключения к службе перевода голоса в текст',
                    error: err,
                });
            }
        });
    }

    private regWebsocket(): Promise<WSConnection> {
        const wsClient = new client();
        return new Promise((res, rej) => {
            wsClient.on('connectFailed', (err) => rej(err));

            try {
                const wsClient = new client();
                wsClient.on('connect', (connection) => {
                    const connectionUUID = uuid();
                    const connectionObj: WSConnection = { id: connectionUUID, connection: connection };
                    res(connectionObj);
                });
                wsClient.connect(this.WS_URL);
            } catch (err) {
                rej(err);
            }
        });
    }
}
