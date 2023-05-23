// import { Context, Telegraf } from 'telegraf';
// import { message } from 'telegraf/filters';
// import config from 'config';
// import { InlineQueryResult } from 'telegraf/typings/core/types/typegram';
// import { Configuration, OpenAIApi } from 'openai';

// const TELEGRAM_TOKEN: string = config.get('TELEGRAM_BOT_TOKEN');
// const bot = new Telegraf(TELEGRAM_TOKEN);

// const configuration = new Configuration({
//   organization: 'org-jm305nsgrZFIpJabfLzMpcCV',
//   apiKey: config.get('OPENAI_API_KEY'),
// });
// const openai = new OpenAIApi(configuration);

console.log('RUN GPT BOT');

// bot.command('quit', async (ctx) => {
//   await ctx.leaveChat();
// });

// bot.command('start', (ctx) => {
//   console.log(ctx);
// });

// let isGpt = false;
// bot.command('gpt', (ctx: Context) => {
//   isGpt = true;
//   ctx.reply('Сейчас будем работать с GPT');
//   ctx.state.gpt = true;
// });

// bot.command('gpt-leave', (ctx: Context) => {
//   isGpt = false;
//   ctx.state.gpt = false;
//   ctx.reply('GPT отключен');
// });

// bot.on(message('text'), async (ctx) => {
//   ctx.sendChatAction('typing');
//   console.log(ctx.state);

//   if (isGpt) {
//     const resp = await openai.createChatCompletion({
//       model: 'gpt-3.5-turbo',
//       messages: [{ role: 'user', content: ctx.message.text }],
//     });
//     const message = resp.data?.choices[0]?.message?.content;
//     ctx.reply(message || 'Gpt не ответил');
//   } else {
//     await ctx.reply(JSON.stringify(ctx.message, null, 4));
//   }

//   console.log('ctx.state', ctx);
// });

// bot.on('callback_query', async (ctx) => {
//   await ctx.answerCbQuery();
// });

// bot.on('inline_query', async (ctx: Context) => {
//   const result: InlineQueryResult[] = [];
//   await ctx.answerInlineQuery(result);
// });

// bot.use(Telegraf.log());

// bot.launch();

// bot.telegram.sendMessage('473467416', 'Hi');

// Enable graceful stop
// process.once('SIGINT', () => bot.stop('SIGINT'));
// process.once('SIGTERM', () => bot.stop('SIGTERM'));
