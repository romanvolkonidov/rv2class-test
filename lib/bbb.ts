/**
 * BigBlueButton API Library
 * Provides methods to create meetings, generate join URLs, and manage BBB resources
 */

import crypto from 'crypto';

// BBB Configuration
const BBB_URL = process.env.BBB_URL || 'https://bbb.rv2class.com/bigbluebutton/api/';
const BBB_SECRET = process.env.BBB_SECRET || 'o0RHfwNyymIA34SY4OKaWoqMmS8fU4PmHlUhGo9FY0';

// Ensure configuration is valid
export function validateBBBConfig(): { valid: boolean; error?: string } {
  if (!BBB_SECRET || BBB_SECRET === '') {
    return { valid: false, error: 'BBB_SECRET is not configured' };
  }
  if (!BBB_URL || BBB_URL === '') {
    return { valid: false, error: 'BBB_URL is not configured' };
  }
  return { valid: true };
}

/**
 * Generate BBB API checksum for secure requests
 */
function generateChecksum(callName: string, queryString: string): string {
  const data = callName + queryString + BBB_SECRET;
  return crypto.createHash('sha1').update(data).digest('hex');
}

/**
 * Build BBB API URL with checksum
 */
function buildBBBUrl(endpoint: string, params: Record<string, any>): string {
  // Filter out undefined/null values
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  // Build query string
  const queryString = Object.entries(filteredParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  // Generate checksum
  const checksum = generateChecksum(endpoint, queryString);

  // Build final URL (BBB_URL already includes /api/)
  const baseUrl = BBB_URL.endsWith('/') ? BBB_URL : `${BBB_URL}/`;
  return `${baseUrl}${endpoint}?${queryString}&checksum=${checksum}`;
}

export interface CreateMeetingOptions {
  meetingID: string;
  meetingName: string;
  attendeePW?: string;
  moderatorPW?: string;
  welcome?: string;
  maxParticipants?: number;
  record?: boolean;
  autoStartRecording?: boolean;
  allowStartStopRecording?: boolean;
  webcamsOnlyForModerator?: boolean;
  muteOnStart?: boolean;
  lockSettingsDisableCam?: boolean;
  lockSettingsDisableMic?: boolean;
  lockSettingsDisablePrivateChat?: boolean;
  lockSettingsDisablePublicChat?: boolean;
  guestPolicy?: 'ALWAYS_ACCEPT' | 'ALWAYS_DENY' | 'ASK_MODERATOR';
  meta?: Record<string, string>;
}

export interface JoinMeetingOptions {
  meetingID: string;
  fullName: string;
  password: string;
  userID?: string;
  redirect?: boolean;
  avatarURL?: string;
  guest?: boolean;
}

export interface MeetingInfo {
  meetingID: string;
  meetingName: string;
  createTime: number;
  createDate: string;
  participantCount: number;
  listenerCount: number;
  voiceParticipantCount: number;
  videoCount: number;
  moderatorCount: number;
  attendees: Array<{
    userID: string;
    fullName: string;
    role: 'MODERATOR' | 'VIEWER';
    isPresenter: boolean;
    isListeningOnly: boolean;
    hasJoinedVoice: boolean;
    hasVideo: boolean;
  }>;
  metadata: Record<string, string>;
  isBreakout: boolean;
  running: boolean;
}

/**
 * Create a new BBB meeting
 */
export async function createMeeting(options: CreateMeetingOptions): Promise<{ success: boolean; error?: string }> {
  const validation = validateBBBConfig();
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Generate random passwords if not provided
    const attendeePW = options.attendeePW || generatePassword();
    const moderatorPW = options.moderatorPW || generatePassword();

    const params: Record<string, any> = {
      meetingID: options.meetingID,
      name: options.meetingName,
      attendeePW,
      moderatorPW,
      welcome: options.welcome || `Welcome to ${options.meetingName}`,
      maxParticipants: options.maxParticipants || 0,
      record: options.record !== undefined ? options.record : false,
      autoStartRecording: options.autoStartRecording || false,
      allowStartStopRecording: options.allowStartStopRecording !== undefined ? options.allowStartStopRecording : true,
      webcamsOnlyForModerator: options.webcamsOnlyForModerator || false,
      muteOnStart: options.muteOnStart || false,
      lockSettingsDisableCam: options.lockSettingsDisableCam || false,
      lockSettingsDisableMic: options.lockSettingsDisableMic || false,
      lockSettingsDisablePrivateChat: options.lockSettingsDisablePrivateChat || false,
      lockSettingsDisablePublicChat: options.lockSettingsDisablePublicChat || false,
      guestPolicy: options.guestPolicy || 'ASK_MODERATOR',
    };

    // Add metadata if provided
    if (options.meta) {
      Object.entries(options.meta).forEach(([key, value]) => {
        params[`meta_${key}`] = value;
      });
    }

    const url = buildBBBUrl('create', params);
    const response = await fetch(url);
    const text = await response.text();

    // Parse XML response
    if (text.includes('<returncode>SUCCESS</returncode>')) {
      return { success: true };
    } else {
      const messageMatch = text.match(/<message>(.+?)<\/message>/);
      const errorMessage = messageMatch ? messageMatch[1] : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('Error creating BBB meeting:', error);
    return { success: false, error: 'Failed to create meeting' };
  }
}

/**
 * Generate join URL for a participant
 */
export function generateJoinUrl(options: JoinMeetingOptions): string {
  const params: Record<string, any> = {
    meetingID: options.meetingID,
    fullName: options.fullName,
    password: options.password,
    userID: options.userID,
    redirect: options.redirect !== undefined ? options.redirect : true,
    guest: options.guest || false,
    // Auto-join audio and enable webcam
    userdata_bbb_auto_join_audio: 'true',
    userdata_bbb_listen_only_mode: 'false',
    userdata_bbb_force_listen_only: 'false',
    userdata_bbb_skip_check_audio: 'true',
    // Hide presentation by default - show participants instead
    userdata_bbb_hide_presentation_on_join: 'true',
    userdata_bbb_auto_share_webcam: 'true',
    userdata_bbb_enable_video: 'true',
  };

  if (options.avatarURL) {
    params.avatarURL = options.avatarURL;
  }

  return buildBBBUrl('join', params);
}

/**
 * Check if a meeting is running
 */
export async function isMeetingRunning(meetingID: string): Promise<boolean> {
  const validation = validateBBBConfig();
  if (!validation.valid) {
    return false;
  }

  try {
    const url = buildBBBUrl('isMeetingRunning', { meetingID });
    const response = await fetch(url);
    const text = await response.text();
    return text.includes('<running>true</running>');
  } catch (error) {
    console.error('Error checking meeting status:', error);
    return false;
  }
}

/**
 * Get meeting info
 */
export async function getMeetingInfo(meetingID: string, moderatorPW: string): Promise<MeetingInfo | null> {
  const validation = validateBBBConfig();
  if (!validation.valid) {
    return null;
  }

  try {
    const url = buildBBBUrl('getMeetingInfo', { meetingID, password: moderatorPW });
    const response = await fetch(url);
    const text = await response.text();

    // Basic XML parsing (you may want to use a proper XML parser library)
    if (!text.includes('<returncode>SUCCESS</returncode>')) {
      return null;
    }

    // Extract basic info (this is simplified - use proper XML parser in production)
    const meetingName = text.match(/<meetingName>(.+?)<\/meetingName>/)?.[1] || '';
    const participantCount = parseInt(text.match(/<participantCount>(\d+)<\/participantCount>/)?.[1] || '0');
    const running = text.includes('<running>true</running>');

    return {
      meetingID,
      meetingName,
      createTime: Date.now(),
      createDate: new Date().toISOString(),
      participantCount,
      listenerCount: 0,
      voiceParticipantCount: 0,
      videoCount: 0,
      moderatorCount: 0,
      attendees: [],
      metadata: {},
      isBreakout: false,
      running,
    };
  } catch (error) {
    console.error('Error getting meeting info:', error);
    return null;
  }
}

/**
 * End a meeting
 */
export async function endMeeting(meetingID: string, moderatorPW: string): Promise<{ success: boolean; error?: string }> {
  const validation = validateBBBConfig();
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const url = buildBBBUrl('end', { meetingID, password: moderatorPW });
    const response = await fetch(url);
    const text = await response.text();

    if (text.includes('<returncode>SUCCESS</returncode>')) {
      return { success: true };
    } else {
      const messageMatch = text.match(/<message>(.+?)<\/message>/);
      const errorMessage = messageMatch ? messageMatch[1] : 'Failed to end meeting';
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('Error ending meeting:', error);
    return { success: false, error: 'Failed to end meeting' };
  }
}

/**
 * Get recordings for a meeting
 */
export async function getRecordings(meetingID: string): Promise<any[]> {
  const validation = validateBBBConfig();
  if (!validation.valid) {
    return [];
  }

  try {
    const url = buildBBBUrl('getRecordings', { meetingID });
    const response = await fetch(url);
    const text = await response.text();

    // Parse recordings from XML (simplified)
    // In production, use a proper XML parser
    const recordings: any[] = [];
    return recordings;
  } catch (error) {
    console.error('Error getting recordings:', error);
    return [];
  }
}

/**
 * Generate a random password
 */
function generatePassword(length: number = 12): string {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

/**
 * Get meetings list
 */
export async function getMeetings(): Promise<any[]> {
  const validation = validateBBBConfig();
  if (!validation.valid) {
    return [];
  }

  try {
    const url = buildBBBUrl('getMeetings', {});
    const response = await fetch(url);
    const text = await response.text();

    // Parse meetings from XML (simplified)
    // In production, use a proper XML parser like fast-xml-parser
    return [];
  } catch (error) {
    console.error('Error getting meetings:', error);
    return [];
  }
}
