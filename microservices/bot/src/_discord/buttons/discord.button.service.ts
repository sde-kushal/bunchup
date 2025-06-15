import { Injectable } from "@nestjs/common";
import { ButtonInteraction, CacheType, Client } from "discord.js";
import { AdminService } from "src/admins/admin.service";
import { DiscordButtonActionParams, DiscordButtonType } from "./types";
import { buttonKeys } from "utils/buttonKeys";
import { DiscordTemplateService } from "../templates/discord.templates.service";
import { BusinessService } from "src/requests/business/request.business.service";
import { OfferService } from "src/requests/offer/request.offer.service";
import { interactionDetails } from "utils/interactionDetails";
import { AdminActionStages } from "src/admins/types";
import { AdminCommandService } from "src/admins/commands/admin.command.service";

@Injectable()
export class DiscordButtonService {
    // private readonly buttonHandler: Map<DiscordButtonType, ({ client, interaction, key }: DiscordButtonActionParams) => Promise<void>>;

    constructor(
        private adminService: AdminService,
        private adminCommandService: AdminCommandService,
        private discordTemplateService: DiscordTemplateService,
        private offerService: OfferService,
        private businessService: BusinessService
    ) { }

    async handleButtonInteraction({ discordClient, interaction }: {
        discordClient: Client,
        interaction: ButtonInteraction<CacheType>
    }) {
        const { remainder: key, type } = this.getButtonType(interaction.customId);
        const guild = interaction.guild;

        if (guild) {
            if (type === "decline") await this.handleDeclineButtonAction({ interaction, key, client: discordClient });
            else if (type === "accept") await this.handleAcceptButtonAction({ interaction, key, client: discordClient });
            else if (type === "pagination") await this.handlePaginationButtonAction({ interaction, key, client: discordClient });
            else if (type === "trigger") await this.handleTriggerButtonAction({ interaction, key, client: discordClient });
            else if (type === "offer") await this.handleOfferButtonAction({ interaction, key, client: discordClient });
            else if (type === "admin") await this.handleAdminButtonAction({ interaction, key, client: discordClient });
        }
    }

    private async handlePaginationButtonAction({ client, interaction, key }: DiscordButtonActionParams) {
        const { index, type } = buttonKeys.pagination.breakdown(key);

        if (type === "business")
            await this.discordTemplateService.paginatedActiveBusinessList({
                currIndex: index,
                interaction,
                editReply: true
            });
    }

    private async handleAcceptButtonAction({ client, interaction, key }: DiscordButtonActionParams) {
        const { userId, type } = buttonKeys.accept.breakdown(key);
        if (type === "business") this.adminService.handleBusinessApplicationButtonAction({ client, interaction, status: "accept", userId });
        else if (type === "offer") this.adminService.handleOfferApplicationButtonAction({ client, interaction, status: "accept", userId });
    }

    private async handleDeclineButtonAction({ client, interaction, key }: DiscordButtonActionParams) {
        const { userId, type } = buttonKeys.decline.breakdown(key);
        if (type === "business") this.adminService.handleBusinessApplicationButtonAction({ client, interaction, status: "decline", userId });
        else if (type === "offer") this.adminService.handleOfferApplicationButtonAction({ client, interaction, status: "decline", userId });
    }

    private async handleAdminButtonAction({ client, interaction, key }: DiscordButtonActionParams) {
        const { element, misc, stage, type } = buttonKeys.admin.breakdown(key);
        if (type === "offer")
            this.adminService.handleAdminOfferApplicationActions({
                client,
                interaction,
                stage: stage as AdminActionStages["offer"],
                element,
                userId: misc
            });
        else if (type === "forumCategory") this.adminCommandService.adminOnlyCreateForumCategory({ interaction });
        else if (type === "activeBusinesses") this.adminCommandService.adminOnlyActiveBusinessList(interaction);
    }

    private async handleTriggerButtonAction({ interaction, key }: DiscordButtonActionParams) {
        const subKey = buttonKeys.trigger.breakdown(key);

        if (subKey === "businessApplyModal") await this.businessService.handleBusinessApplySlashCommand(interaction);
    }

    private async handleOfferButtonAction({ interaction, key }: DiscordButtonActionParams) {
        const { remainder, stage } = buttonKeys.offer.breakdown(key);

        const { user } = interactionDetails({
            details: {
                user: {
                    globalName: true,
                    id: true,
                    username: true
                }
            },
            interaction
        });

        if (user && user.id) {
            this.offerService.offerApplicationDataManagement({
                index: stage,
                interaction,
                userId: user.id,
                remainderKey: remainder
            });
        }
        else {
            interaction.reply({
                content: `Error: User not identified. Bot could not recongize the user.`,
                flags: 64
            });
        }
    }


    private getButtonType(id: string) {
        const keys = id.split("-");
        return {
            type: keys[0] as DiscordButtonType,
            remainder: keys[1]
        };
    }
}