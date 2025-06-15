import { Module } from "@nestjs/common";
import { AirtableService } from "./airtable.service";

@Module({
    imports: [],
    providers: [AirtableService],
    exports: [AirtableService]
})
export class AirtableModule { }