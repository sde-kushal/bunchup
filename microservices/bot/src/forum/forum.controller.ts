import { Body, Controller, Param, Post, Query } from "@nestjs/common";
import { ForumService } from "./forum.service";
import { isPositiveNumber } from "utils/validTypes";


@Controller("forum")
export class ForumController {
    constructor(private forumService: ForumService) { }

    @Post("new")
    async broadcastAnnouncement(@Body() body: any) {
        try {
            if (!body.categoryId || !isPositiveNumber(body.categoryId))
                throw new Error(`❌ Category ID missing or incorrect`);

            if (!body.name || !body.slowmode || !isPositiveNumber(body.slowmode) || !body.threadRateLimit || !isPositiveNumber(body.threadRateLimit))
                throw new Error(`❌ Body data incomplete or malformed`);


            const categoryId = body.categoryId;

            const name = body.name as string;
            const slowmode = parseInt(body.slowmode);
            const threadRateLimit = parseInt(body.threadRateLimit);

            return this.forumService.createNewForumChannel({ categoryId, forum: { name, slowmode, threadRateLimit } });
        }
        catch (err) {
            console.error(`Forum channel API error: ${err.message || err}`);
            return {
                status: false,
                message: err.message || `Forum channel API error`
            };
        }
    }

}