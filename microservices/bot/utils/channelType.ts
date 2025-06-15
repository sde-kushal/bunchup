import { ChannelType, Interaction } from "discord.js"

export type Channel = "DM" | "TEXT" | "FORUM" | "VOICE" | "GROUP_DM" | "ANNOUNCEMENT" | "THREAD_PUBLIC" | "THREAD_PRIVATE" | "STAGE" | "OTHER"

export const channelType = (interaction: Interaction): {
  type: Channel,
  inForum: boolean
} => {
  const channel = interaction.channel;
  const parent = channel && 'parent' in channel ? channel.parent : undefined;
  const channelType = channel?.type;
  
  return {
    type: 
      channelType===ChannelType.DM ? "DM"
    : channelType===ChannelType.GuildText ? "TEXT"
    // : channel===ChannelType.GuildForum ? "FORUM"
    : channelType===ChannelType.GuildVoice ? "VOICE"
    : channelType===ChannelType.GuildAnnouncement ? "ANNOUNCEMENT"
    : channelType===ChannelType.GuildStageVoice ? "STAGE"
    : channelType===ChannelType.PublicThread ? "THREAD_PUBLIC"
    : channelType===ChannelType.PrivateThread ? "THREAD_PRIVATE"
    : "OTHER",
    inForum: !!(parent && parent.type === ChannelType.GuildForum)
  }
}