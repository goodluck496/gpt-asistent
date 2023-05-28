import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramUserEntity } from '../database/telegram-user.entity';
import { TelegramUserSessionEntity } from '../database/telegram-user-session-entity';
import { TelegramUserSessionOptionsEntity } from '../database/telegram-user-session-options.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TelegramUserEntity, TelegramUserSessionEntity, TelegramUserSessionOptionsEntity])],
    providers: [SessionsService],
})
export class SessionsModule {}
