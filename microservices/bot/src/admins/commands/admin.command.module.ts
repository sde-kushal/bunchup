import { Module } from "@nestjs/common";
import { AdminCommandService } from "./admin.command.service";
import { DiscordTemplateModule } from "src/_discord/templates/discord.template.module";
import { RedisModule } from "src/_redis/redis.module";

@Module({
    imports: [
        DiscordTemplateModule,
        RedisModule
    ],
    providers: [AdminCommandService],
    exports: [AdminCommandService]
})
export class AdminCommandModule { }