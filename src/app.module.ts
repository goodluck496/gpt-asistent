import { OpenaiModule } from './openai.module';
import { TelegramBotModule } from './telegram-bot.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { SessionsModule } from './session/sessions.module';

@Module({
    imports: [DatabaseModule.forRoot(), TelegramBotModule, OpenaiModule, SessionsModule],
    controllers: [AppController],
    providers: [AppService],
    exports: [DatabaseModule, SessionsModule],
})
export class AppModule {}
