import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from './_kafka/kafka.module';
import { DataDeleteModule } from './actions/data/delete/data.delete.module';
import { DataReadModule } from './actions/data/read/data.read.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),

        KafkaModule,
        DataDeleteModule,
        DataReadModule
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
