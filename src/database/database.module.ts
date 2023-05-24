import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [],
    // exports: [TypeOrmModule.forFeature([TelegramUser])],
})
export class DatabaseModule {
    static forRoot(): DynamicModule {
        return {
            module: DatabaseModule,
            imports: [
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: 'db',
                    port: 5432,
                    username: 'postgres',
                    password: 'example',
                    database: 'mydb',
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
