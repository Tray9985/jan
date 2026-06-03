import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { localStorageKey } from '@/constants/localStorage'
import {
  getDefaultNotificationPosition,
  isNotificationPosition,
  type NotificationPosition,
} from '@/utils/toastPlacement'

export type FontSize = '14px' | '15px' | '16px' | '18px' | '20px'

export const ACCENT_COLORS = [
  {
    name: 'Gray',
    value: 'gray',
    thumb: '#3F3F46',
    primary: '#f17455',
    sidebar: { light: '#f1f1f1', dark: '#171717' },
  },
  {
    name: 'Red',
    value: 'red',
    thumb: '#F0614B',
    primary: '#F0614B',
    sidebar: { light: '#F3CBC4', dark: '#5E1308' },
  },
  {
    name: 'Orange',
    value: 'orange',
    thumb: '#E9A23F',
    primary: '#E9A23F',
    sidebar: { light: '#F3DFC4', dark: '#5C3A0A' },
  },
  {
    name: 'Green',
    value: 'green',
    thumb: '#88BA42',
    primary: '#88BA42',
    sidebar: { light: '#DFF3C4', dark: '#374B1B' },
  },
  {
    name: 'Emerald',
    value: 'emerald',
    thumb: '#38AB51',
    primary: '#38AB51',
    sidebar: { light: '#C4F3CE', dark: '#194D24' },
  },
  {
    name: 'Teal',
    value: 'teal',
    thumb: '#38AB8D',
    primary: '#38AB8D',
    sidebar: { light: '#C4F3E6', dark: '#194D3F' },
  },
  {
    name: 'Cyan',
    value: 'cyan',
    thumb: '#45BBDE',
    primary: '#45BBDE',
    sidebar: { light: '#C4E8F3', dark: '#0F4657' },
  },
  {
    name: 'Blue',
    value: 'blue',
    thumb: '#456BDE',
    primary: '#456BDE',
    sidebar: { light: '#C4D0F3', dark: '#0F2157' },
  },
  {
    name: 'Purple',
    value: 'purple',
    thumb: '#865EEA',
    primary: '#865EEA',
    sidebar: { light: '#D2C4F3', dark: '#220C5A' },
  },
  {
    name: 'Pink',
    value: 'pink',
    thumb: '#D55EF3',
    primary: '#D55EF3',
    sidebar: { light: '#FFDAE9', dark: '#4D075F' },
  },
  {
    name: 'Rose',
    value: 'rose',
    thumb: '#F655B8',
    primary: '#F655B8',
    sidebar: { light: '#F3C4E1', dark: '#61053E' },
  },
] as const

export type AccentColorValue = (typeof ACCENT_COLORS)[number]['value']
const DEFAULT_ACCENT_COLOR: AccentColorValue = 'gray'

const applyAccentColorToDOM = (colorValue: string) => {
  const color = ACCENT_COLORS.find((c) => c.value === colorValue)
  if (!color) return

  const root = document.documentElement

  root.style.setProperty('--primary', color.primary)
}

interface InterfaceSettingsState {
  fontSize: FontSize
  accentColor: AccentColorValue
  notificationPosition: NotificationPosition
  showTokenSpeed: boolean
  setFontSize: (size: FontSize) => void
  setAccentColor: (color: AccentColorValue) => void
  setNotificationPosition: (position: NotificationPosition) => void
  setShowTokenSpeed: (show: boolean) => void
  resetInterface: () => void
}

type InterfaceSettingsPersistedSlice = Omit<
  InterfaceSettingsState,
  | 'resetInterface'
  | 'setFontSize'
  | 'setAccentColor'
  | 'setNotificationPosition'
  | 'setShowTokenSpeed'
>

export const fontSizeOptions = [
  { label: 'Small', value: '14px' as FontSize },
  { label: 'Medium', value: '16px' as FontSize },
  { label: 'Large', value: '18px' as FontSize },
  { label: 'Extra Large', value: '20px' as FontSize },
]

// Default interface settings
const defaultFontSize: FontSize = '16px'

const createDefaultInterfaceValues = (): InterfaceSettingsPersistedSlice => {
  return {
    fontSize: defaultFontSize,
    accentColor: DEFAULT_ACCENT_COLOR,
    notificationPosition: getDefaultNotificationPosition(),
    showTokenSpeed: true,
  }
}

const interfaceStorage = createJSONStorage<InterfaceSettingsPersistedSlice>(() =>
  localStorage
)

export const useInterfaceSettings = create<InterfaceSettingsState>()(
  persist<
    InterfaceSettingsState,
    [],
    [],
    InterfaceSettingsPersistedSlice
  >(
    (set) => {
      const defaultState = createDefaultInterfaceValues()
      return {
        ...defaultState,
        resetInterface: () => {
          // Reset font size
          document.documentElement.style.setProperty(
            '--font-size-base',
            defaultFontSize
          )

          // Reset accent color preset
          applyAccentColorToDOM(DEFAULT_ACCENT_COLOR)

          // Update state
          set({
            fontSize: defaultFontSize,
            accentColor: DEFAULT_ACCENT_COLOR,
            notificationPosition: getDefaultNotificationPosition(),
            showTokenSpeed: true,
          })
        },

        setAccentColor: (color: AccentColorValue) => {
          const colorExists = ACCENT_COLORS.find((c) => c.value === color)
          if (!colorExists) return

          applyAccentColorToDOM(color)
          set({ accentColor: color })
        },

        setFontSize: (size: FontSize) => {
          // Update CSS variable
          document.documentElement.style.setProperty('--font-size-base', size)
          // Update state
          set({ fontSize: size })
        },

        setNotificationPosition: (position) => {
          if (!isNotificationPosition(position)) return
          set({ notificationPosition: position })
        },

        setShowTokenSpeed: (show) => {
          set({ showTokenSpeed: show })
        },
      }
    },
    {
      name: localStorageKey.settingInterface,
      storage: interfaceStorage,
      partialize: (state) => ({
        fontSize: state.fontSize,
        accentColor: state.accentColor,
        notificationPosition: state.notificationPosition,
        showTokenSpeed: state.showTokenSpeed,
      }),
      // Apply settings when hydrating from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migrate old font size value '15px' to '16px'
          if ((state.fontSize as FontSize) === '15px') {
            state.fontSize = '16px'
          }

          // Apply font size from storage
          document.documentElement.style.setProperty(
            '--font-size-base',
            state.fontSize
          )

          // Apply accent color preset
          const accentColorValue = state.accentColor || DEFAULT_ACCENT_COLOR
          applyAccentColorToDOM(accentColorValue)

          if (
            !state.notificationPosition ||
            !isNotificationPosition(state.notificationPosition)
          ) {
            state.notificationPosition = getDefaultNotificationPosition()
          }

          if (typeof state.showTokenSpeed !== 'boolean') {
            state.showTokenSpeed = true
          }
        }

        // Return the state to be used for hydration
        return state
      },
    }
  )
)
