import { Global, Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka.consumer.service';

@Global()
@Module({
    imports: [],
    providers: [KafkaConsumerService],
    exports: [KafkaConsumerService]
})
export class KafkaConsumerModule { }
