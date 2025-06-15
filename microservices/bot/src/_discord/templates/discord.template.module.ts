import { Module } from "@nestjs/common";
import { DiscordTemplateService } from "./discord.templates.service";
import { RedisModule } from "src/_redis/redis.module";

@Module({
    imports: [
        RedisModule
    ],
    providers: [DiscordTemplateService],
    exports: [DiscordTemplateService]
})
export class DiscordTemplateModule { }