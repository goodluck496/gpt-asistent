import { OpenaiModule } from './openai.module';
import { TelegramBotModule } from './telegram-bot.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';

@Module({
    imports: [DatabaseModule.forRoot(), TelegramBotModule, OpenaiModule],
    controllers: [AppController],
    providers: [AppService],
    exports: [DatabaseModule],
})
export class AppModule {}
