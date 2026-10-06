import type { Channel } from '../../types/api'
import { accentFor, channelInitials } from '../../features/channels/channelMeta'

type Props = {
  channels: Channel[]
}

/**
 * Lingkaran ikon untuk empat kanal satellite. Inisial diambil dari nama
 * kanal, jadi "Watch" menjadi WA, "b2b supermarket" menjadi BS, dan
 * "Print Shop" menjadi PS. Warna bulunya ditentukan per indeks.
 */
export function ChannelEntries({ channels }: Props) {
  const linked = channels.filter((channel) => channel.url)

  if (linked.length === 0) {
    return null
  }

  return (
    <div className="tp-icon-entries">
      {linked.map((channel) => (
        <a
          key={channel.platform_id}
          className="tp-icon-entry"
          href={channel.url ?? undefined}
        >
          <span
            className={`tp-icon-entry__circle tp-accent-${accentFor(linked.indexOf(channel))}`}
            aria-hidden="true"
          >
            {channelInitials(channel.name)}
          </span>
          <span>{channel.name}</span>
        </a>
      ))}
    </div>
  )
}