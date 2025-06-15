import { Module } from "@nestjs/common";
import { DiscordButtonService } from "./discord.button.service";
import { AdminModule } from "src/admins/admin.module";
import { DiscordTemplateModule } from "../templates/discord.template.module";
import { BusinessModule } from "src/requests/business/request.business.module";
import { OfferModule } from "src/requests/offer/request.offer.module";
import { AdminCommandModule } from "src/admins/commands/admin.command.module";

@Module({
    imports: [
        AdminModule,
        AdminCommandModule,
        DiscordTemplateModule,
        BusinessModule,
        OfferModule
    ],
    providers: [DiscordButtonService],
    exports: [DiscordButtonService]
})
export class DiscordButtonModule { }