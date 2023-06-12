import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import axios from 'axios';
import { resolve } from 'path';
import { convertOgaToWav } from '../helpers';

@Injectable()
export class FileSaveService {
    private pathForSave = '/usr/src/app/src/downloads';

    saveByLink(url: string, fileName: string): Promise<string> {
        return new Promise(async (res, rej) => {
            const response = await axios({
                url,
                method: 'get',
                responseType: 'stream',
            });
            const localFilePath = resolve(this.pathForSave, fileName);
            const file = fs.createWriteStream(localFilePath);
            response.data.pipe(file);
            file.on('finish', () => {
                file.close(async () => {
                    const filePath = await convertOgaToWav(localFilePath);
                    res(filePath);
                    console.log(`Файл ${fileName} загружен успешно`);
                });
            });
        });
    }
}
