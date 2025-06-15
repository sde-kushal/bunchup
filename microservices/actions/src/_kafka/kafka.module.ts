import { Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KafkaConsumerModule } from './consumer/kafka.consumer.module';

@Global()
@Module({
    imports: [
        KafkaConsumerModule
    ],
    providers: [KafkaService],
    exports: [KafkaService]
})
export class KafkaModule { }
