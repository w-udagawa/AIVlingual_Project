/**
 * OBS service types
 */

export interface OBSScene {
  name: string
  sources: OBSSource[]
}

export interface OBSSource {
  name: string
  type: string
  visible: boolean
  settings?: Record<string, any>
}

export interface OBSRecordingStatus {
  recording: boolean
  paused: boolean
  duration: number
  bytes?: number
}

export interface OBSCommand {
  command: string
  params?: Record<string, any>
}