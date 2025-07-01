/**
 * Application constants
 */

export const APP_NAME = 'AIVlingual'
export const APP_VERSION = '0.1.0'

export const DIFFICULTY_LEVELS = {
  1: 'Beginner',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert'
} as const

export const LANGUAGE_CODES = {
  JAPANESE: 'ja',
  ENGLISH: 'en',
  AUTO: 'auto'
} as const

export const OBS_MODES = {
  SUBTITLE: 'subtitle',
  CHAT: 'chat',
  EDUCATIONAL: 'educational',
  AVATAR: 'avatar',
  ANALYSIS: 'analysis'
} as const

export const AVATAR_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  EXCITED: 'excited',
  CONFUSED: 'confused'
} as const

export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong'
} as const