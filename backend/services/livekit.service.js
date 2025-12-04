/**
 * LiveKit Service
 *
 * Handles LiveKit room management, token generation, and server-side recording.
 * Uses LiveKit Cloud or self-hosted LiveKit server.
 */

const { AccessToken, RoomServiceClient, EgressClient } = require('livekit-server-sdk');

// LiveKit configuration from environment
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://your-project.livekit.cloud';

/**
 * Check if LiveKit is configured
 */
function isConfigured() {
  return LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL;
}

/**
 * Get RoomServiceClient for room management
 */
function getRoomClient() {
  if (!isConfigured()) {
    throw new Error('LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL.');
  }
  return new RoomServiceClient(LIVEKIT_URL.replace('wss://', 'https://'), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/**
 * Get EgressClient for recording management
 */
function getEgressClient() {
  if (!isConfigured()) {
    throw new Error('LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL.');
  }
  return new EgressClient(LIVEKIT_URL.replace('wss://', 'https://'), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/**
 * Generate an access token for a participant to join a room
 *
 * @param {string} roomName - The room name (use callId)
 * @param {string} participantId - Unique participant identifier (groupMemberId)
 * @param {string} participantName - Display name for the participant
 * @param {Object} options - Additional options
 * @param {boolean} options.canPublish - Whether participant can publish audio/video
 * @param {boolean} options.canSubscribe - Whether participant can subscribe to others
 * @returns {string} JWT access token
 */
function generateToken(roomName, participantId, participantName, options = {}) {
  if (!isConfigured()) {
    throw new Error('LiveKit is not configured');
  }

  const { canPublish = true, canSubscribe = true } = options;

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantId,
    name: participantName,
    ttl: '2h', // Token valid for 2 hours
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe,
    canPublishData: true,
  });

  return token.toJwt();
}

/**
 * Create a room explicitly (optional - rooms are auto-created on join)
 *
 * @param {string} roomName - The room name
 * @param {Object} options - Room options
 * @returns {Promise<Object>} Room info
 */
async function createRoom(roomName, options = {}) {
  const roomClient = getRoomClient();

  const roomOptions = {
    name: roomName,
    emptyTimeout: 300, // 5 minutes until empty room is deleted
    maxParticipants: options.maxParticipants || 10,
  };

  return await roomClient.createRoom(roomOptions);
}

/**
 * Delete a room
 *
 * @param {string} roomName - The room name to delete
 */
async function deleteRoom(roomName) {
  const roomClient = getRoomClient();
  await roomClient.deleteRoom(roomName);
}

/**
 * List participants in a room
 *
 * @param {string} roomName - The room name
 * @returns {Promise<Array>} List of participants
 */
async function listParticipants(roomName) {
  const roomClient = getRoomClient();
  return await roomClient.listParticipants(roomName);
}

/**
 * Start recording a room (Room Composite Egress)
 * Records all participants in the room to a single file.
 *
 * @param {string} roomName - The room name to record
 * @param {string} callType - 'phone' or 'video'
 * @param {string} outputPath - Path/filename for the recording (without extension)
 * @returns {Promise<Object>} Egress info including egressId
 */
async function startRoomRecording(roomName, callType, outputPath) {
  const egressClient = getEgressClient();

  // For phone calls, record audio only
  // For video calls, record audio + video
  const isAudioOnly = callType === 'phone';

  // Configure output - save to local file or S3
  // For now, we'll use S3 if configured, otherwise file output
  const s3Bucket = process.env.AWS_S3_BUCKET;
  const fileExtension = isAudioOnly ? 'mp3' : 'mp4';

  let output;
  if (s3Bucket) {
    // S3 output
    output = {
      s3: {
        bucket: s3Bucket,
        region: process.env.AWS_REGION || 'us-east-1',
        accessKey: process.env.AWS_ACCESS_KEY_ID,
        secret: process.env.AWS_SECRET_ACCESS_KEY,
        filepath: `recordings/${outputPath}.${fileExtension}`,
      },
    };
  } else {
    // Local file output (for development)
    output = {
      file: {
        filepath: `/tmp/recordings/${outputPath}.${fileExtension}`,
      },
    };
  }

  const egressOptions = {
    roomName,
    audioOnly: isAudioOnly,
    ...(isAudioOnly ? {
      audioTrackOutput: output,
    } : {
      fileOutput: output,
    }),
  };

  // For audio-only, use track composite egress
  // For video, use room composite egress
  if (isAudioOnly) {
    // Room Composite with audio only
    return await egressClient.startRoomCompositeEgress(roomName, {
      file: output.s3 || output.file,
      preset: 'PRESET_AUDIO_ONLY_MP3',
    });
  } else {
    // Room Composite with video
    return await egressClient.startRoomCompositeEgress(roomName, {
      file: output.s3 || output.file,
      preset: 'PRESET_720P30',
    });
  }
}

/**
 * Stop a recording
 *
 * @param {string} egressId - The egress ID to stop
 * @returns {Promise<Object>} Final egress info
 */
async function stopRecording(egressId) {
  const egressClient = getEgressClient();
  return await egressClient.stopEgress(egressId);
}

/**
 * Get egress status
 *
 * @param {string} egressId - The egress ID to check
 * @returns {Promise<Object>} Egress info
 */
async function getEgressInfo(egressId) {
  const egressClient = getEgressClient();
  const egresses = await egressClient.listEgress({ egressId });
  return egresses[0];
}

/**
 * List all active egresses for a room
 *
 * @param {string} roomName - The room name
 * @returns {Promise<Array>} List of egresses
 */
async function listRoomEgresses(roomName) {
  const egressClient = getEgressClient();
  return await egressClient.listEgress({ roomName });
}

module.exports = {
  isConfigured,
  generateToken,
  createRoom,
  deleteRoom,
  listParticipants,
  startRoomRecording,
  stopRecording,
  getEgressInfo,
  listRoomEgresses,
  LIVEKIT_URL,
};
