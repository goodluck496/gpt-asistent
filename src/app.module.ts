import { OpenaiModule } from './openai.module';
import { TelegramBotModule } from './telegram-bot.module';
import { Inject, Module, Scope } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Telegraf } from 'telegraf';
import * as config from 'config';

const TELEGRAM_TOKEN: string = config.get('TELEGRAM_BOT_TOKEN');

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: 'db',
            port: 5432,
            username: 'postgres',
            password: 'example',
            database: 'mydb',
            entities: [],
            synchronize: true,
            autoLoadEntities: true,
            logger: 'simple-console',
            logging: [],
        }),
        TelegramBotModule,
        OpenaiModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
