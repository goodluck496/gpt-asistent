import { Inject, Module } from '@nestjs/common';
import * as config from 'config';
import { Configuration, OpenAIApi } from 'openai';
import { ChatCompletionRequestMessage } from 'openai/api';

export class OpenAiService {
    constructor(@Inject('OPEN_AI') private openAi: OpenAIApi) {}

    async createCompletion(messages: ChatCompletionRequestMessage[]): Promise<string> {
        const completion = await this.openAi.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages,
        });
        const message = completion.data?.choices[0]?.message?.content;

        return message;
    }
}

@Module({
    imports: [],
    controllers: [],
    providers: [
        {
            provide: 'OPEN_AI',
            useFactory: () => {
                console.log('factory');

                const configuration = new Configuration({
                    organization: config.get('OPENAI_ORG_KEY'),
                    apiKey: config.get('OPENAI_API_KEY'),
                });
                return new OpenAIApi(configuration);
            },
        },
        OpenAiService,
    ],
    exports: [OpenAiService],
})
export class OpenaiModule {}
