import { Controller, Get, Query } from "@nestjs/common";
import { DataReadService } from "./data.read.service";

@Controller("/read")
export class DataReadController {
    constructor(private dataReadService: DataReadService) { }

    @Get("/business")
    async fetchData(@Query() query: any) {
        const index = parseInt(query?.index);
        const limit = parseInt(query?.limit);

        if (isNaN(index) || isNaN(limit))
            return [];

        return this.dataReadService.readBusinessData({ index, limit });
    }
}