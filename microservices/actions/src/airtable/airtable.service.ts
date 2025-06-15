import { createRequire } from "module";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { AirtableFields } from "constants/airtable";
import { AIRTABLE_ACCESS_TOKEN, AIRTABLE_BASE_ID } from "constants/env";

@Injectable()
export class AirtableService implements OnModuleInit {
    // private base: Airtable.Base;

    constructor() { }

    async onModuleInit() {

    }

    async addRowData({ rows, tableName, tableId }: AirtableFields) {
        // try {
        //     const created = await this.base(tableId).create(rows);
        //     return created;
        // }
        // catch (err) {
        //     console.error(`Failed to insert data to airtable: ${err}`);
        //     if (err.statusCode === 404)
        //         console.error(`Table '${tableName}' doesnt exist in airtable`);

        //     throw err;
        // }
    }
}