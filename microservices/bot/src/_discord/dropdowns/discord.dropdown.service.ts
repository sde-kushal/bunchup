import { Injectable } from "@nestjs/common";
import { CacheType, Client, StringSelectMenuInteraction } from "discord.js";
import { DiscordDropdownType } from "./types";
import { OfferService } from "src/requests/offer/request.offer.service";
import { AdminService } from "src/admins/admin.service";

@Injectable()
export class DiscordDropdownService {
    constructor(
        private offerService: OfferService,
        private adminService: AdminService
    ) { }

    async handleDropdownInteraction({ interaction }: { discordClient: Client, interaction: StringSelectMenuInteraction<CacheType> }) {
        const { remainder: key, type } = this.getDropdownType(interaction.customId);
        const guild = interaction.guild;

        if (guild) {
            if (type === "offer") await this.offerService.offerApplicationDropdownHandle(interaction, key);
            else if (type === "admin") await this.adminService.handleDropdowns(interaction, key);
        }
    }


    private getDropdownType(id: string) {
        const keys = id.split("-");
        return {
            type: keys[0] as DiscordDropdownType,
            remainder: keys[1]
        };
    }
}