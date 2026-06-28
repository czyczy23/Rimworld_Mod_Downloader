import type { IconProps } from '@tabler/icons-react'
import type { ComponentType } from 'react'
import {
  IconAlertTriangle,
  IconBoltOff,
  IconBulb,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconClipboardList,
  IconConfetti,
  IconDownload,
  IconFolder,
  IconFolderOpen,
  IconHome,
  IconLanguage,
  IconPackage,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSettings,
  IconStar,
  IconTool,
  IconX
} from '@tabler/icons-react'

export type AppIconName =
  | 'app'
  | 'download'
  | 'add'
  | 'settings'
  | 'language'
  | 'folder'
  | 'folderOpen'
  | 'queue'
  | 'warning'
  | 'hint'
  | 'success'
  | 'check'
  | 'error'
  | 'close'
  | 'disconnected'
  | 'search'
  | 'waiting'
  | 'configure'
  | 'home'
  | 'edit'
  | 'favorite'
  | 'back'
  | 'next'
  | 'complete'
  | 'chevronDown'

const iconMap = {
  app: IconPackage,
  download: IconDownload,
  add: IconPlus,
  settings: IconSettings,
  language: IconLanguage,
  folder: IconFolder,
  folderOpen: IconFolderOpen,
  queue: IconClipboardList,
  warning: IconAlertTriangle,
  hint: IconBulb,
  success: IconCircleCheck,
  check: IconCheck,
  error: IconCircleX,
  close: IconX,
  disconnected: IconBoltOff,
  search: IconSearch,
  waiting: IconClock,
  configure: IconTool,
  home: IconHome,
  edit: IconPencil,
  favorite: IconStar,
  back: IconChevronLeft,
  next: IconChevronRight,
  complete: IconConfetti,
  chevronDown: IconChevronDown
} satisfies Record<AppIconName, ComponentType<IconProps>>

interface AppIconProps extends Omit<IconProps, 'ref'> {
  name: AppIconName
}

export function AppIcon({ name, size = 18, stroke = 1.8, style, ...props }: AppIconProps) {
  const Icon = iconMap[name]

  return (
    <Icon
      aria-hidden="true"
      size={size}
      stroke={stroke}
      style={{ flex: '0 0 auto', ...style }}
      {...props}
    />
  )
}
