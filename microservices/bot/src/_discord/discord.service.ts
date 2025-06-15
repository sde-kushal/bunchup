import { Injectable, OnModuleInit } from '@nestjs/common'
import { fetchRoleRemove } from 'api/adminOnly'
import { ROLE_NAMES } from 'constants/roles'
import { CacheType, ChannelType, Client, GatewayIntentBits, Interaction, ModalSubmitInteraction, Partials, REST, Routes, SlashCommandBuilder, ThreadChannel } from 'discord.js'
import { MemberService } from 'src/member/member.service'
import { DiscordButtonService } from './buttons/discord.button.service'
import { SLASH_COMMANDS } from 'constants/commands'
import { BusinessService } from 'src/requests/business/request.business.service'
import { OfferService } from 'src/requests/offer/request.offer.service'
import { AdminCommandService } from 'src/admins/commands/admin.command.service'
import { MODALS } from 'constants/modals'
import { BOT_TOKEN, CLIENT_ID, GUILD_ID } from 'constants/env'
import { DiscordDropdownService } from './dropdowns/discord.dropdown.service'
import { AdminService } from 'src/admins/admin.service'
import { ForumPostService } from 'src/forum/post/forum.post.service'

@Injectable()
export class DiscordService implements OnModuleInit {
    private client: Client;
    private readonly commandHandlers: Map<string, (interaction: Interaction) => Promise<void>>
    private readonly modalHandlers: Map<string, (interaction: ModalSubmitInteraction<CacheType>) => Promise<void>>

    constructor(
        private memberService: MemberService,
        private discordButtonService: DiscordButtonService,
        private discordDropdownService: DiscordDropdownService,
        private businessService: BusinessService,
        private offerService: OfferService,
        private adminCommandService: AdminCommandService,
        private adminService: AdminService,
        private forumPostService: ForumPostService,
    ) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,                   // for thread/forum events
                GatewayIntentBits.GuildMessages,            // send/read messages in channels
                GatewayIntentBits.GuildMembers,             // manage roles
                GatewayIntentBits.GuildMessageTyping,       // detect typing in forums/channels
                GatewayIntentBits.DirectMessages,           // DM users
            ],
            partials: [Partials.Channel],                   // required for DM
        });
        this.commandHandlers = new Map<string, (interaction: Interaction) => Promise<void>>();
        this.modalHandlers = new Map<string, (interaction: ModalSubmitInteraction<CacheType>) => Promise<void>>();
    }

    async onModuleInit() {
        const BOT_TOKEN = process.env.BOT_TOKEN || "";
        if (!BOT_TOKEN)
            throw new Error('Missing DISCORD_TOKEN in .env');

        this.client.once('ready', async () => {
            console.log(`✅ Logged in as ${this.client.user?.tag}`);

            // REGISTER SLASH COMMANDS + MODAL HANDLERS
            await this.registerSlashCommands();
            this.registerModalHandlers();

            // SEND ONE-TIME BOT COMMAND MESSAGES
            // await this.offerService.offerWelcomeStageExecuteOnce({ client: this.client });
            // await this.adminCommandService.adminOnlyActionButtonsExecuteOnce({ client: this.client });
        });

        // INTERACTION ACTIONS ##############################
        this.client.on('interactionCreate', async (interaction) => {

            // ### SLASH COMMAND ###
            if (interaction.isChatInputCommand()) {
                const handler = this.commandHandlers.get(interaction.commandName);
                if (handler) await handler(interaction);
            }

            // ### MODAL SUBMIT ###
            else if (interaction.isModalSubmit()) {
                const handler = this.modalHandlers.get(interaction.customId);
                if (handler) await handler(interaction);
            }

            // ### BUTTON CLICK ###
            else if (interaction.isButton()) {
                this.discordButtonService.handleButtonInteraction({
                    discordClient: this.client,
                    interaction
                });
            }

            // ### SELECT MENU SUBMIT ###
            else if (interaction.isStringSelectMenu()) {
                this.discordDropdownService.handleDropdownInteraction({
                    discordClient: this.client,
                    interaction
                });
            }
        });

        // GUILD MEMBER ACTIONS ##############################
        this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
            // ### ROLE MANUALLY REMOVED ###
            const removedRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));

            if (removedRoles.size > 0) {
                const isBusinessRoleRemoved = removedRoles.find((role) => role.name === ROLE_NAMES.BUSINESS);
                if (isBusinessRoleRemoved) {
                    const userId = newMember.id;

                    // DM user that their role was removed
                    this.dmUser({
                        userId,
                        message: "Your role of 'Verified Business' is revoked by the admin.",
                    });

                    // update actions microservice to delete 
                    fetchRoleRemove({
                        userId,
                        roleType: "business"
                    });
                }
            }

        });

        this.client.on('guildMemberRemove', this.memberService.memberExits);

        // FORUM CHANNEL - THREAD ACTIONS ##############################
        this.client.on('threadCreate', async (thread: ThreadChannel, isNewThread: boolean) => {
            if (thread.joinable) await thread.join();

            // new thread created in an offer -------
            if (isNewThread && thread.parent?.type === ChannelType.GuildText) this.forumPostService.handleNewForumPostCreation({ thread });
        });

        // FORUM CHANNEL - THREAD MEMBER JOIN/LEAVE ##############################
        this.client.on('threadMembersUpdate', async (addedMembers, removedMembers, thread: ThreadChannel) => {
            if (addedMembers.size > 0) {
                addedMembers.forEach(member => {
                    console.log(`🟢 ${member.user?.username} joined thread: ${thread.name}`);
                });
            }

            if (removedMembers.size > 0) {
                removedMembers.forEach(member => {
                    console.log(`🔴 ${member.user?.username} left thread: ${thread.name}`);
                });
            }
        });

        await this.client.login(BOT_TOKEN)
    }


    private async dmUser({ message, userId }: { userId: string, message: string }) {
        const user = await this.client.users.fetch(userId);
        await user.send(message);
    }


    private async registerSlashCommands() {
        const slashCommands: { handler: (interaction: Interaction) => Promise<void>, name: string, description: string }[] = [
            {
                name: SLASH_COMMANDS.APPLY_FOR_VERIFIED_BUSINESS.label,
                description: SLASH_COMMANDS.APPLY_FOR_VERIFIED_BUSINESS.description,
                handler: this.businessService.handleBusinessApplySlashCommand.bind(this.businessService)
            },
            // {
            //     name: SLASH_COMMANDS.ADMIN_ONLY.FETCH_ACTIVE_BUSINESSES.label,
            //     description: SLASH_COMMANDS.ADMIN_ONLY.FETCH_ACTIVE_BUSINESSES.description,
            //     handler: this.adminCommandService.adminOnlyActiveBusinessList.bind(this.adminCommandService)
            // },
        ];

        slashCommands.forEach(({ name, handler }) => this.commandHandlers.set(name, handler));
        const builders = slashCommands.reduce((acc, { description, name }) =>
            acc = [...acc, new SlashCommandBuilder().setName(name).setDescription(description)],
            [] as SlashCommandBuilder[]
        );
        await this.registerSlashCommandsToDiscord(builders);
    }

    private registerModalHandlers() {
        // verified business ---------------
        this.modalHandlers.set(MODALS.APPLY_FOR_VERIFIED_BUSINESS.customId, this.businessService.handleBusinessModalSubmit.bind(this.businessService));

        // offer applications ---------------
        this.modalHandlers.set(MODALS.OFFER_VENUE_DETAILS.customId, (interaction) => this.offerService.offerApplicationModalHandle(interaction, "OFFER_VENUE_DETAILS"));
        this.modalHandlers.set(MODALS.OFFER_EVENT_DETAILS.customId, (interaction) => this.offerService.offerApplicationModalHandle(interaction, "OFFER_EVENT_DETAILS"));
        this.modalHandlers.set(MODALS.OFFER_TIMING_DETAILS.customId, (interaction) => this.offerService.offerApplicationModalHandle(interaction, "OFFER_TIMING_DETAILS"));
        this.modalHandlers.set(MODALS.OFFER_PRICING_DETAILS.customId, (interaction) => this.offerService.offerApplicationModalHandle(interaction, "OFFER_PRICING_DETAILS"));
        this.modalHandlers.set(MODALS.OFFER_PRICING_REBATE_TIERS.customId, (interaction) => this.offerService.offerApplicationModalHandle(interaction, "OFFER_PRICING_REBATE_TIERS"));

        // admin commands ---------------
        this.modalHandlers.set(MODALS.ADMIN_ONLY_OFFER_APPLICATION_DETAILS.customId, (interaction) => this.adminService.handleModal(interaction, "ADMIN_ONLY_OFFER_APPLICATION_DETAILS"));
        this.modalHandlers.set(MODALS.ADMIN_ONLY_FORUM_CATEGORY_CREATE.customId, (interaction) => this.adminCommandService.handleModal(interaction, "ADMIN_ONLY_FORUM_CATEGORY_CREATE"));
    }

    getClient() {
        return this.client;
    }

    private async registerSlashCommandsToDiscord(slashCommands: SlashCommandBuilder[]) {
        try {
            if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
                throw new Error("🚫 Missing DISCORD_TOKEN or GUILD_ID or CLIENT_ID in .env");
            }

            const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: slashCommands.map((builder) => builder.toJSON()) },
            );

            slashCommands.forEach((builder) => console.log(`✔️  Registered slash command: ${builder.name}`));
        }
        catch (error) {
            console.error("❌ Error registering slash command:", error);
        }
    }
}
