import { DataSource } from 'typeorm';
import { TelegramUserEntity } from './telegram-user.entity';

export const databaseProviders = [
    {
        provide: 'DATA_SOURCE',
        useFactory: async () => {
            const dataSource = new DataSource({
                type: 'postgres',
                host: 'db',
                port: 5432,
                username: 'postgres',
                password: 'example',
                database: 'mydb',
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                synchronize: true,
                logger: 'simple-console',
                logging: ['query'],
            });

            return dataSource.initialize();
        },
    },
    {
        provide: 'TG_USER_REPOSITORY',
        useFactory: (dataSource: DataSource) => dataSource.getRepository(TelegramUserEntity),
        inject: ['DATA_SOURCE'],
    },
];
