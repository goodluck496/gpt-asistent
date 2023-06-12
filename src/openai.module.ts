import { Inject, Injectable, Module } from '@nestjs/common';
import * as config from 'config';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from 'openai';
import { SessionsService } from './session/sessions.service';
import { SessionOptionKeys } from './database/telegram-user-session-options.entity';
import { SessionsModule } from './session/sessions.module';
import { MessageEntity } from './database/message.entity';
import { Repository } from 'typeorm';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';

export enum OpenAiModels {
    GPT_3_5 = 'gpt-3.5-turbo',
    CODE_DAVINCI_0_2 = 'code-davinci-002',
}

@Injectable()
export class OpenAiService {
    constructor(
        @Inject('OPEN_AI') private openAi: OpenAIApi,
        private sessionService: SessionsService,
        @InjectRepository(MessageEntity) private messageRepo: Repository<MessageEntity>,
    ) {}

    async getSessionMessages(sessionId: number): Promise<ChatCompletionRequestMessage[]> {
        const sessionMessages: MessageEntity[] = await this.messageRepo.find({ where: { sessionId: sessionId } });

        if (!sessionMessages.length) {
            return [];
        }
        const messages = [
            ...sessionMessages.reduce((acc: ChatCompletionRequestMessage[], curr) => {
                acc.push({
                    role: curr.gptAnswer
                        ? ChatCompletionRequestMessageRoleEnum.Assistant
                        : ChatCompletionRequestMessageRoleEnum.User,
                    content: curr.text,
                });
                return acc;
            }, []),
        ];

        return messages;
    }

    async createCompletion(sessionId: number, messages: ChatCompletionRequestMessage[]): Promise<string> {
        const sessionOptions = await this.sessionService.getSessionOptions(sessionId);
        const chatModel = sessionOptions.find((el) => el.key === SessionOptionKeys.GPT_MODEL) || OpenAiModels.GPT_3_5;

        try {
            // const comp = await this.openAi.createCompletion({
            //     model: String(chatModel),
            //     prompt: messages,
            // });
            //
            // console.log(comp.data.choices[0].text);
            const completion = await this.openAi.createChatCompletion({
                model: String(chatModel),
                messages,
            });
            const message = completion.data?.choices[0]?.message?.content;

            return message;
        } catch (error) {
            return JSON.stringify({ model: chatModel, message: messages.pop(), error }, null, 4);
        }
    }
}

@Module({
    imports: [SessionsModule, TypeOrmModule.forFeature([MessageEntity])],
    controllers: [],
    providers: [
        {
            provide: 'OPEN_AI',
            useFactory: () => {
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
