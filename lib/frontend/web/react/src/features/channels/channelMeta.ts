import type { Channel } from '../../types/api'

export type ChannelAccent = 'green' | 'blue' | 'amber' | 'violet'

const ACCENTS: ChannelAccent[] = ['green', 'blue', 'amber', 'violet']

export function accentFor(index: number): ChannelAccent {
  return ACCENTS[index % ACCENTS.length] ?? 'green'
}

export function channelInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase()
}

export function usableChannels(channels: Channel[]): Channel[] {
  return channels.filter((channel) => typeof channel.url === 'string' && channel.url.length > 0)
}