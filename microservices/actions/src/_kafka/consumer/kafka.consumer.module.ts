import { Global, Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka.consumer.service';
import { ApplicationsModule } from 'src/actions/applications/applications.module';
import { DataCreateModule } from 'src/actions/data/create/data.create.module';

@Global()
@Module({
    imports: [
        ApplicationsModule,
        DataCreateModule
    ],
    providers: [KafkaConsumerService],
    exports: [KafkaConsumerService]
})
export class KafkaConsumerModule { }
