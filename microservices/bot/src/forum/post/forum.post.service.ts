import { Injectable } from "@nestjs/common";
import { ChannelType, ThreadChannel } from "discord.js";
import { generateEmbed } from "utils/generateEmbed";

@Injectable()
export class ForumPostService {
    constructor() { }

    async handleNewForumPostCreation({ thread }: { thread: ThreadChannel }) {
        try {
            const userId = thread.ownerId;
            const threadId = thread.id;
            const threadTitle = thread.name;
            const isPrivateThread = thread.type === ChannelType.PrivateThread;

            console.log({ isPrivateThread, author: userId, threadTitle });

            // send a pinned message for new users to submit modal --
            const { embed, rows } = generateEmbed({
                data: {
                    embed: {
                        title: `Register for '${threadTitle}' group`,
                        description: "Click the button below to register. Once regsistered, you can start participating in the group!"
                    },
                    actions: [
                        {
                            category: "buttons",
                            data: [
                                {
                                    id: `register-thread_${threadId}`,
                                    label: "Register",
                                    type: "primary"
                                }
                            ]
                        }
                    ]
                }
            });

            const msg = await thread.send({
                embeds: [embed],
                components: rows
            });

            await msg.pin();
        }
        catch (err) {
            console.error(`Err parsing forum channel post: ${err.message || err}`)
        }
    }
}