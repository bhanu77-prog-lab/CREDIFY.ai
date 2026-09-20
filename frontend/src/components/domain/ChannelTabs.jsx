import Tabs from '../ui/Tabs'
import { IconLink, IconMail, IconMessage, IconPhone, IconRupee } from '../ui/Icons'

export const CHANNELS = [
  {
    value: 'message',
    label: 'Message',
    icon: <IconMessage size={16} />,
    placeholder:
      'Paste the SMS or WhatsApp message exactly as you received it, including any link…',
    hint: 'Works for SMS, WhatsApp, Telegram and any other chat message.',
  },
  {
    value: 'call',
    label: 'Call',
    icon: <IconPhone size={16} />,
    placeholder: 'Type or paste what the caller said, as closely as you can remember…',
    hint: 'Write down what the caller claimed and what they asked you to do.',
  },
  {
    value: 'email',
    label: 'Email',
    icon: <IconMail size={16} />,
    placeholder:
      'Paste the whole email. Including the From: and Reply-To: lines lets us check the sender…',
    hint: 'Headers are optional, but they let us spot a forged sender.',
  },
  {
    value: 'url',
    label: 'Link',
    icon: <IconLink size={16} />,
    placeholder: 'Paste the link you were sent, for example http://example-bank-verify.info/login',
    hint: 'We inspect the address itself. We never open the link.',
  },
  {
    value: 'upi',
    label: 'UPI',
    icon: <IconRupee size={16} />,
    placeholder:
      'Paste the payment request or describe it: who is asking, how much, and what they promised…',
    hint: 'Collect requests, QR codes, refund offers and payment demands.',
  },
]

export function channelConfig(value) {
  return CHANNELS.find((channel) => channel.value === value) || CHANNELS[0]
}

export default function ChannelTabs({ value, onChange }) {
  return (
    <Tabs
      items={CHANNELS.map(({ value: v, label, icon }) => ({ value: v, label, icon }))}
      value={value}
      onChange={onChange}
      ariaLabel="What are you checking?"
    />
  )
}
