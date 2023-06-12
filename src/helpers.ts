export const bool = (value: unknown): boolean => {
    return !!eval(String(value));
};

export function convertOgaToWav(inputFilePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        const outputFile = inputFilePath.replace('.oga', '.wav');
        new ffmpeg({
            source: inputFilePath,
        })
            .outputOptions('-acodec', 'pcm_s16le')
            .audioCodec('pcm_s16le')
            .on('error', (err) => {
                reject(err);
            })
            .on('end', () => {
                resolve(outputFile);
            })
            .save(outputFile);
    });
}
