import { Body, Controller, Param, Post, Query } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { AdminApplicationType } from "./types";


@Controller("notification")
export class NotificationController {
    constructor(private notificationService: NotificationService) { }

    @Post("announcement/:channelId")
    async broadcastAnnouncement(@Param("channelId") channelId: string, @Body() body: any, @Query() query: any) {
        const reqType = query?.type as AdminApplicationType | undefined;
        if (!reqType) throw new Error(`query param 'type' not given at notification.controller.ts`);

        return this.notificationService.adminNewApplication({ channelId, data: body, type: reqType });
    }

}