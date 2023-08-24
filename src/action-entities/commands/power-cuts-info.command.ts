import { Inject, Injectable } from '@nestjs/common';
import { BaseCommand } from './base.command';
import { Commands, IBaseCommand, KeyboardAction } from './types';
import { TELEGRAM_BOT_TOKEN } from '../../tokens';
import { Context, Telegraf } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../../database/telegram-user.entity';
import { Repository } from 'typeorm';
import { TelegramUserSessionEntity } from '../../database/telegram-user-session-entity';
import { SessionsService } from '../../session/sessions.service';
import { Update } from 'typegram';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as moment from 'moment';

interface IRowData {
    region: string;
    location: { name: string; description: string }[];
    from: string;
    to: string;
}

interface ISingleRowData extends Omit<IRowData, 'location'> {
    location: string;
    description: string;
}

@Injectable()
export class PowerCutsInfoCommand extends BaseCommand implements IBaseCommand {
    name = Commands.POWER_CUTS_INFO;
    description = 'информация об отключениях электроэнергии';

    baseUrl = 'https://www.severelectro.kg';
    url = this.baseUrl + '/content/article/69-perechen-uchastkov-rabot';

    actions: KeyboardAction<string>[] = [];

    constructor(
        @Inject(TELEGRAM_BOT_TOKEN) public readonly bot: Telegraf,
        @InjectRepository(TelegramUserEntity) private readonly tgUsersRepo: Repository<TelegramUserEntity>,
        @InjectRepository(TelegramUserSessionEntity) private readonly tgUserSessionRepo: Repository<TelegramUserSessionEntity>,
        private readonly sessionService: SessionsService,
    ) {
        super();
        super.registrationHandler();
    }

    async commandHandler(from: 'action' | 'command', ctx: Context<Update> | Context<Update.CallbackQueryUpdate>) {
        try {
            const pageUrls = await this.getPageUrls();
            // console.log(pageUrls);

            pageUrls.sort((a, b) => moment(b[0]).unix() - moment(a[0]).unix());

            const actions: KeyboardAction<string>[] = pageUrls.map(([date, url], index) => {
                const dateFormatted = moment(date).format('DD.MM.Y');
                const title = dateFormatted === moment().format('DD.MM.Y') ? 'Сегодня' : dateFormatted;

                return {
                    name: `select-date-${index}`,
                    handler: (ctx) => this.selectDate(ctx, url),
                    title,
                };
            });

            console.log('actions', actions);
            

            this.registrationActions(actions.slice(0, 2));
            await this.applyActions(ctx, 'Выберите дату', actions.slice(0, 2));
        } catch (err) {
            console.log('error', err);
        }
    }

    private async parseOutageTable(url: string): Promise<IRowData[]> {
        const result: IRowData[] = [];
        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            const table = $('div.content > table');
            if (!table) {
                console.log('not found table');
                return [];
            }

            $(table)
                .find('tr')
                .each((i, row) => {
                    if (i < 2) {
                        console.log('skip i row');
                        
                        return;
                    }

                    const colsHead: Array<keyof ISingleRowData> = ['region', 'location', 'from', 'to', 'description'];
                    const columns = $(row).find('td');
                    const regionCol = $(row).find('td[rowspan]');
                    let region = $(regionCol).find('strong').text();

                    if (!regionCol.length && !$(columns.get(0)).find('strong').text()) {
                        colsHead.shift();
                    } else if (!regionCol.length && colsHead.length === columns.length) {
                        region = $(columns.get(0)).find('p').text();
                    } else if (!region) {
                        region = $(regionCol).find('p').text();
                    }

                    const rowData: ISingleRowData = colsHead.reduce((acc, curr, index) => {
                        const column = columns.get(index);

                        acc[curr] = $(column).find('p').text();

                        return acc;
                    }, {} as ISingleRowData);

                    if (region) {
                        result.push({
                            region,
                            location: [
                                {
                                    name: rowData.location,
                                    description: rowData.description,
                                },
                            ],
                            from: rowData.from,
                            to: rowData.to,
                        });
                        return;
                    }

                    const resultIndex = result.length - 1;
                    if (!result[resultIndex]) {
                        return [];
                    }

                    result[resultIndex].location.push({
                        name: rowData.location,
                        description: rowData.description,
                    });
                    result[resultIndex].from = rowData.from;
                    result[resultIndex].to = rowData.to;
                });

            return result;
        } catch (err) {
            console.log('error parse table', err);
            return result;
        }
    }

    private async getPageUrls(): Promise<[string, string][]> {
        try {
            const response = await axios.get(this.url);
            const $ = cheerio.load(response.data);

            const titles: [string, string][] = [];
            $('div.posts > .post-item').each((index, element) => {
                const tagA = $(element).find('div.post-title').find('a');
                const title = tagA.text();
                const dateOfPost = this.findDateFromTitle(title);
                titles.push([dateOfPost, this.baseUrl + tagA.attr('href')]);
            });

            return titles;
        } catch (error) {
            console.log(error);
            //throw new Error('Failed to fetch and parse data');
            return [];
        }
    }

    private findDateFromTitle(text: string): string {
        // Регулярное выражение для поиска даты в формате "число месяц"
        const regex = /[(0-9)]{1,2}\s[(а-я)]+/gi;

        // Функция для преобразования месяца из текстового формата в числовой
        function getMonthNumber(month) {
            const months = {
                января: '01',
                февраля: '02',
                марта: '03',
                апреля: '04',
                мая: '05',
                июня: '06',
                июля: '07',
                августа: '08',
                сентября: '09',
                октября: '10',
                ноября: '11',
                декабря: '12',
            };
            return months[month];
        }

        // Извлечение даты из текста
        const match = regex.exec(text);
        const DATE_FORMAT = 'Y.MM.DD';
        if (match) {
            const date = match[0];
            const [day, monthText] = date.split(' ');

            const month = getMonthNumber(monthText.toLowerCase());
            const year = new Date().getFullYear(); // Текущий год

            const dateStr = `${year}-${month}-${day}`;
            const momentDate = moment(dateStr).format(DATE_FORMAT);

            return momentDate;
        } else {
            console.log('Дата не найдена.');
            return moment().format(DATE_FORMAT);
        }
    }

    private async selectRegion(ctx: Context<Update.CallbackQueryUpdate>, rows: IRowData[], region: string): Promise<void> {
        const selectedRegion = rows.find((el) => el.region === region);
        if (!selectedRegion) {
            ctx.reply('Не нашел выбранный регион');
            return;
        }

        ctx.reply(
            `Регион: ${region}\r\n
В период с ${selectedRegion.from} по ${selectedRegion.to}\r\n\r\n` +
                selectedRegion.location
                    .map((el) => `${el.name}\r\n\r\n Будут проводиться работы: ${el.description}`)
                    .join('\r\n------------------------\r\n'),
        );
    }

    async selectDate(ctx: Context<Update.CallbackQueryUpdate>, url: string): Promise<void> {
        console.log('selectDate', url);
        
        const table = await this.parseOutageTable(url);
        console.log('table',table);

        const regions = table.map((el) => el.region);
        const actions = regions.map((el, index) => ({
            name: `select-region-${index + 1}`,
            title: `${index + 1}`,
            handler: (ctx) => this.selectRegion(ctx, table, el),
        }));
        const replyMessage = 'Выбери регион: \r\n' + regions.map((el, index) => `[${index + 1}] - ${el} \r\n`).join('');

        const actionChunks = 7;
        if (actions.length > actionChunks) {
            this.registrationActions(actions.slice(0, actionChunks));
            this.registrationActions(actions.slice(actionChunks, actions.length));

            await this.applyActions(ctx, replyMessage, actions.slice(0, actionChunks));
            await this.applyActions(ctx, 'Еще варианты', actions.slice(actionChunks, actions.length));
        } else {
            this.registrationActions(actions);
            await this.applyActions(ctx, replyMessage, actions);
        }
    }
}
