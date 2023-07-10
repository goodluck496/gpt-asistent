import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import * as config from 'config';

const DB_HOST: string = config.get('DATABASE_HOST');
const DB_PORT = Number(config.get('DATABASE_PORT'));
const DB_NAME: string = config.get('DATABASE_DB_NAME');
const DB_USER_NAME: string = config.get('DATABASE_USER_NAME');
const DB_USER_PASS: string = config.get('DATABASE_USER_PASS');

@Module({
    imports: [],
})
export class DatabaseModule {
    static forRoot(): DynamicModule {
        return {
            module: DatabaseModule,
            imports: [
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: DB_HOST,
                    port: DB_PORT,
                    username: DB_USER_NAME,
                    password: DB_USER_PASS,
                    database: DB_NAME,
                    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                    synchronize: true,
                    autoLoadEntities: true,
                }),
            ],
            providers: [],
            exports: [TypeOrmModule],
        };
    }
}
