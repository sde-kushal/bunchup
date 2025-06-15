import { Global, Module } from "@nestjs/common"
import { DiscordService } from "./discord.service"
import { BusinessModule } from "src/requests/business/request.business.module"
import { KafkaModule } from "src/_kafka/kafka.module"
import { NotificationModule } from "src/notification/notification.module"
import { MemberModule } from "src/member/member.module"
import { AdminCommandModule } from "src/admins/commands/admin.command.module"
import { DiscordButtonModule } from "./buttons/discord.button.module"
import { OfferModule } from "src/requests/offer/request.offer.module"
import { DiscordDropdownModule } from "./dropdowns/discord.dropdown.module"
import { AdminModule } from "src/admins/admin.module"
import { ForumPostModule } from "src/forum/post/forum.post.module"

@Global()
@Module({
    imports: [
        BusinessModule,
        OfferModule,
        KafkaModule,
        NotificationModule,
        AdminModule,
        AdminCommandModule,
        MemberModule,
        DiscordButtonModule,
        DiscordDropdownModule,
        ForumPostModule
    ],
    providers: [DiscordService],
    exports: [DiscordService],
})
export class DiscordModule { }
