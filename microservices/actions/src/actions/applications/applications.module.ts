import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
    imports: [
        RedisModule
    ],
    providers: [ApplicationsService],
    exports: [ApplicationsService]
})
export class ApplicationsModule { }
