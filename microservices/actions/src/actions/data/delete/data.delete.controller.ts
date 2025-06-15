import { Body, Controller, Delete } from "@nestjs/common";
import { DataDeleteService } from "./data.delete.service";
import { RoleType } from "constants/roles";

@Controller("/delete")
export class DataDeleteController {
    constructor(private dataDeleteService: DataDeleteService) { }

    @Delete("/role")
    async roleDeleteCleanup(@Body() body: any) {
        const userId = body?.id;
        const type = body?.type as RoleType;

        if (userId && type)
            return this.dataDeleteService.deleteRoleCleanUp({ type, userId });

        return false;
    }
}