import { Commands, IBaseCommand } from './types';
import { Context, Telegraf } from 'telegraf';
import { Inject, Injectable, Type } from '@nestjs/common';
import { TELEGRAM_ACTION_ENTITY_TOKENS, TELEGRAM_BOT_TOKEN } from '../../tokens';
import { BaseCommand } from './base.command';
import { IBaseTelegramActionEntity, TELEGRAM_ACTION_TYPES } from '../../types';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class HelpCommand extends BaseCommand implements IBaseCommand {
    order = 999;
    name = Commands.HELP;
    description = 'подсказка';

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @Inject(TELEGRAM_ACTION_ENTITY_TOKENS) public readonly telegramEntities: Type<IBaseTelegramActionEntity>[],
        private moduleRef: ModuleRef,
    ) {
        super();
        this.registrationHandler();
    }

    registrationHandler(): void {
        this.bot.help(async (ctx: Context) => {
            const messageRows: string[] = ['** Доступные команды **', ''];
            const onlyCommands: IBaseCommand[] = [];
            await Promise.all(
                this.telegramEntities.map(async (el) => {
                    const entity: IBaseTelegramActionEntity = await this.moduleRef.get(el.name);
                    if (entity.type !== TELEGRAM_ACTION_TYPES.COMMAND) {
                        return;
                    }
                    const command: IBaseCommand = entity as unknown as IBaseCommand;
                    onlyCommands.push(command);
                }),
            );

            onlyCommands
                .sort((a, b) => a.order - b.order)
                .forEach((command) => messageRows.push(`/${command.name} - ${command.description}`));

            ctx.reply(messageRows.join('\r\n'));
        });
    }
}
