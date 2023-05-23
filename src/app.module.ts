import { OpenaiModule } from './openai.module';
import { TelegramBotModule } from './telegram-bot.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

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
        }),
        TelegramBotModule,
        OpenaiModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
