import { Module } from "@nestjs/common";
import { DataCreateService } from "./data.create.service";
import { PostgresModule } from "src/postgres/postgres.module";
import { AirtableModule } from "src/airtable/airtable.module";
import { RedisModule } from "src/redis/redis.module";

@Module({
    imports: [
        PostgresModule,
        AirtableModule,
        RedisModule
    ],
    providers: [DataCreateService],
    exports: [DataCreateService]
})
export class DataCreateModule { }
