import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { RedisModule } from 'src/_redis/redis.module';

@Module({
    imports: [
        RedisModule
    ],
    providers: [
        NotificationService,
        NotificationController
    ],
    exports: [
        NotificationController,
        NotificationService
    ],
    controllers: [NotificationController]
})
export class NotificationModule { }
