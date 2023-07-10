const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

const MODELS_PATH = '/usr/src/piper/models/';

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.get('/api/tts/models', async (req, res) => {
    const modelsPath = '/usr/src/piper/models';
    const readDir = promisify(fs.readdir);
    const readFile = promisify(fs.readFile);
    const dir = await readDir(modelsPath);

    const response = [];
    for (const modelName of dir) {
        const files = await readDir(path.resolve(modelsPath, modelName));
        const modelParamsFile = files.find((el) => el.endsWith('json'));
        console.log('modelParamsFile', modelParamsFile);
        const modelParams = await readFile(path.resolve(modelsPath, modelName, modelParamsFile)).then((data) =>
            JSON.parse(data.toString('utf8')),
        );
        if ('espeak' in modelParams) {
            response.push({
                ...modelParams.espeak,
                modelName,
            });
        }
    }

    res.send(response);
});

app.post('/api/tts', async (req, res) => {
    const { text, modelName, noiseScale, noiseWidth, lengthScale } = req.body;

    if (!modelName) {
        return res.status(400).send('Не указана модель распознавания');
    }

    const fsReadDir = promisify(fs.readdir);

    const fileName = `tmp-file-${+new Date()}-${Math.floor(Math.random() * 10000)}.wav`;
    const dirData = await fsReadDir(MODELS_PATH + modelName);
    const modelFileName = dirData.find((el) => el.endsWith('.onnx'));

    if (!modelFileName) {
        return res.status(400).send('Не найден файл модели распознавания');
    }

    const modelPath = path.resolve(MODELS_PATH, modelName, modelFileName);
    const noiseScaleArg = noiseScale ? `--noise_scale ${noiseScale}` : '';
    const noiseWidthArg = noiseWidth ? `--noise_w ${noiseWidth}` : '';
    const lengthScaleArg = lengthScale ? `--length_scale ${lengthScale}` : '';

    const command = `echo "${text}" | ../piper/piper --model ${modelPath} --output_file ${fileName} ${noiseScaleArg} ${noiseWidthArg} ${lengthScaleArg}`;

    console.log('piper command');
    console.log(command);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка выполнения команды: ${error}`);
            res.status(500).send('Произошла ошибка при генерации речи.');
        } else {
            fs.readFile(fileName, (err, data) => {
                if (err) {
                    console.error(`Ошибка чтения аудиофайла: ${err}`);
                    res.status(500).send('Произошла ошибка при чтении аудиофайла.');
                } else {
                    // Отправка аудио в ответ на запрос
                    res.set('Content-Type', 'audio/wav');
                    res.send(data);
                    console.log('Отправляем буфер с голосом');
                    fs.unlinkSync(fileName);
                }
            });
        }
    });
});

const port = 5002;
app.listen(port, () => {
    console.log(`Синтезатор речи (Piper) запущен на порту ${port}`);
});
