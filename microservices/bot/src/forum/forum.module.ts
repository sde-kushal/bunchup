import { Module } from "@nestjs/common";
import { DiscordModule } from "src/_discord/discord.module";
import { RedisModule } from "src/_redis/redis.module";
import { ForumService } from "./forum.service";
import { ForumController } from "./forum.controller";

@Module({
    imports: [
        RedisModule,
        DiscordModule
    ],
    providers: [ForumService],
    exports: [ForumService],
    controllers: [ForumController]
})
export class ForumModule { }