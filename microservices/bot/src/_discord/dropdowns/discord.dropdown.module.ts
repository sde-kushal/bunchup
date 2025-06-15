import { Module } from "@nestjs/common";
import { DiscordDropdownService } from "./discord.dropdown.service";
import { OfferModule } from "src/requests/offer/request.offer.module";
import { AdminModule } from "src/admins/admin.module";

@Module({
    imports: [
        OfferModule,
        AdminModule
    ],
    providers: [DiscordDropdownService],
    exports: [DiscordDropdownService]
})
export class DiscordDropdownModule { }