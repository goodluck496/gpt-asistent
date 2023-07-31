import { Commands, IBaseCommand, KeyboardAction } from './types';
import { Telegraf } from 'telegraf';
import { SessionsService } from '../../session/sessions.service';
import { SessionOptionKeys } from '../../database/telegram-user-session-options.entity';
import { Inject, Injectable } from '@nestjs/common';
import { BaseCommand } from './base.command';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';
import { VoiceService } from '../../voice/voice.service';
import { IVoiceModel } from '../../voice/voice.const-and-types';

enum VOICE_ACTION_ENUM {
    ENABLE = 'enable',
    DISABLE = 'disable',
    SET_SEX_VOICE = 'set-sex-voice',
    SELECT_VOICE_SPEED = 'select-voice-speed',
}

@Injectable()
export class VoiceReplyCommand extends BaseCommand implements IBaseCommand {
    name: Commands = Commands.VOICE;
    defaultArg = 'enabled';
    description = 'аргументами enable или disable для ответов с помощью голосовых сообщений';
    order = 4;
    commandFirst = false;

    actions: KeyboardAction<VOICE_ACTION_ENUM>[] = [
        {
            name: VOICE_ACTION_ENUM.ENABLE,
            title: 'Включить',
            handler: (ctx) => this.updateVoiceOption(ctx, VOICE_ACTION_ENUM.ENABLE),
        },
        {
            name: VOICE_ACTION_ENUM.DISABLE,
            title: 'Выключить',
            handler: (ctx) => this.updateVoiceOption(ctx, VOICE_ACTION_ENUM.DISABLE),
        },
        {
            name: VOICE_ACTION_ENUM.SET_SEX_VOICE,
            title: 'Указать пол диктора',
            handler: (ctx) => this.showCurrentVoiceSex(ctx),
        },
    ];

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        private readonly sessionService: SessionsService,
        private voiceService: VoiceService,
    ) {
        super();
        super.registrationHandler();
    }

    applyCommandWithArguments(ctx, action: string, commandAgs) {
        if (action === VOICE_ACTION_ENUM.SET_SEX_VOICE) {
            return this.updateVoiceOption(ctx, action, commandAgs[0]);
        }
        if (action === VOICE_ACTION_ENUM.ENABLE) {
            return this.updateVoiceOption(ctx, action);
        }
        if (action === VOICE_ACTION_ENUM.DISABLE) {
            return this.updateVoiceOption(ctx, action);
        }
    }

    private async updateVoiceOption(ctx, value: VOICE_ACTION_ENUM, additionalValue?: string): Promise<void> {
        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        if (!session) {
            return void 0;
        }
        if (!value || value === VOICE_ACTION_ENUM.ENABLE) {
            ctx.reply('Ответы теперь будут голосом!');
            return this.sessionService
                .addAndUpdateOption(session.id, SessionOptionKeys.VOICE_ENABLE, 'boolean', true)
                .then(void 0);
        }
        if (value === VOICE_ACTION_ENUM.DISABLE) {
            ctx.reply('Ответы будут текстом!');
            return this.sessionService
                .addAndUpdateOption(session.id, SessionOptionKeys.VOICE_ENABLE, 'boolean', false)
                .then(void 0);
        }

        return Promise.resolve();
    }

    private async setVoiceSex(ctx, model: IVoiceModel): Promise<void> {
        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);

        ctx.reply(`С вами будет общаться ${model.name}`);
        this.sessionService
            .addAndUpdateOption(session.id, SessionOptionKeys.VOICE_SEX_MODEL, 'string', model.modelName)
            .then(void 0);
        this.sessionService.addAndUpdateOption(session.id, SessionOptionKeys.VOICE_SEX, 'string', model.sex).then(void 0);
    }

    private closeSetSex(ctx): Promise<void> {
        return this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.id).then(void 0);
    }

    private async showCurrentVoiceSex(ctx): Promise<void> {
        const session = await this.sessionService.getActiveSessionByChatId(ctx.from.id);
        const currentSex = session.options.find((el) => el.key === SessionOptionKeys.VOICE_SEX);

        if (!currentSex) {
            return void 0;
        }

        const actions: KeyboardAction<VOICE_ACTION_ENUM>[] = await this.voiceService.getModels().then((data) =>
            data.map(
                (el) =>
                    ({
                        name: el.modelName,
                        title: el.name,
                        handler: (ctx) => this.setVoiceSex(ctx, el),
                    } as KeyboardAction<VOICE_ACTION_ENUM>),
            ),
        );

        this.registrationActions(actions);
        void this.applyActions(ctx, 'Выбери модель', actions);
    }
}
