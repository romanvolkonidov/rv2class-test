"""
LiveKit Audio Agent with DeepFilterNet3 - Ultra Noise Suppression
Provides studio-quality voice with absolutely silent background
"""

import asyncio
import logging
import os
import numpy as np
import torch
from typing import Dict, Optional
from dataclasses import dataclass
from aiohttp import web

from livekit import rtc, api
from livekit.rtc import AudioFrame, AudioSource, TrackPublishOptions

# DeepFilterNet imports
from df.enhance import enhance, init_df
from df.io import resample

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class AgentConfig:
    """Configuration for the audio agent"""
    livekit_url: str
    livekit_api_key: str
    livekit_api_secret: str
    agent_identity: str = "deepfilter-agent"
    sample_rate: int = 48000  # DeepFilterNet works at 48kHz
    channels: int = 1
    post_gain: float = 1.0  # DeepFilterNet preserves volume well
    attenuation_limit: float = 100  # How much to suppress noise (dB) - higher = more aggressive


class DeepFilterProcessor:
    """
    Audio processor using DeepFilterNet3
    
    Features:
    - State-of-the-art noise suppression
    - Handles complex noise patterns (rain, traffic, keyboard, etc.)
    - Preserves voice quality
    - Real-time processing capability
    """
    
    def __init__(self, sample_rate: int = 48000, post_gain: float = 1.0, attenuation_limit: float = 100):
        self.sample_rate = sample_rate
        self.post_gain = post_gain
        self.attenuation_limit = attenuation_limit
        
        # Initialize DeepFilterNet model
        logger.info("🚀 Loading DeepFilterNet3 model...")
        self.model, self.df_state, _ = init_df()
        
        # Move model to GPU if available
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self.model.to(self.device)
        logger.info(f"✅ DeepFilterNet3 loaded on {self.device}")
        logger.info(f"   📊 Sample rate: {self.sample_rate} Hz")
        logger.info(f"   🔊 Post gain: {self.post_gain}x")
        logger.info(f"   🎯 Attenuation limit: {self.attenuation_limit} dB")
        
        # Buffer for processing
        self.buffer = np.array([], dtype=np.float32)
        self.hop_size = 480  # Process in 10ms chunks for low latency
        
    def process(self, audio_data: np.ndarray) -> np.ndarray:
        """Process audio and return ultra-clean version"""
        try:
            # Convert to float32 if needed
            original_dtype = audio_data.dtype
            if audio_data.dtype == np.int16:
                audio_data = audio_data.astype(np.float32) / 32768.0
            elif audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # Add to buffer
            self.buffer = np.concatenate([self.buffer, audio_data])
            
            # Process if we have enough samples (at least 1 second for good context)
            min_samples = self.sample_rate  # 1 second
            if len(self.buffer) < min_samples:
                # Return zeros for now (will accumulate)
                return np.zeros(len(audio_data), dtype=original_dtype)
            
            # Process the buffer
            audio_tensor = torch.from_numpy(self.buffer).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                # Enhance audio with DeepFilterNet
                enhanced = enhance(
                    self.model,
                    self.df_state,
                    audio_tensor,
                    atten_lim_db=self.attenuation_limit
                )
            
            # Convert back to numpy
            enhanced_audio = enhanced.squeeze(0).cpu().numpy()
            
            # Apply post-gain if needed
            if self.post_gain != 1.0:
                enhanced_audio = enhanced_audio * self.post_gain
            
            # Keep latest samples in buffer for continuity
            output_length = len(audio_data)
            self.buffer = self.buffer[output_length:]
            
            # Return the processed chunk
            result = enhanced_audio[:output_length]
            
            # Convert back to original dtype
            if original_dtype == np.int16:
                result = (result * 32768.0).clip(-32768, 32767).astype(np.int16)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error processing audio with DeepFilterNet: {e}")
            return audio_data  # Return original on error


class AudioAgent:
    """LiveKit agent that processes audio in real-time with DeepFilterNet"""
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.rooms: Dict[str, rtc.Room] = {}
        self.processors: Dict[str, DeepFilterProcessor] = {}
        self.audio_sources: Dict[str, AudioSource] = {}
        self.processing_tracks: set = set()
        self.published_tracks: Dict[str, rtc.LocalAudioTrack] = {}
        self.running = False

    async def discover_and_join_rooms(self):
        """Discover active rooms and join them"""
        try:
            # Create API client
            lkapi = api.LiveKitAPI(
                self.config.livekit_url,
                self.config.livekit_api_key,
                self.config.livekit_api_secret
            )
            
            # List all active rooms
            rooms_list = await lkapi.room.list_rooms(api.ListRoomsRequest())
            
            for room_info in rooms_list.rooms:
                room_name = room_info.name
                
                # Skip if already joined
                if room_name in self.rooms:
                    continue
                
                # Skip if no participants
                if room_info.num_participants == 0:
                    continue
                
                logger.info(f"🔍 Discovered active room: {room_name} ({room_info.num_participants} participants)")
                
                # Join the room
                await self.join_room(room_name)
                
        except Exception as e:
            logger.error(f"❌ Error discovering rooms: {e}")

    async def start(self):
        """Start the agent and listen for rooms"""
        self.running = True
        logger.info("🤖 DeepFilterNet Audio Agent starting...")
        
        # Keep agent running and periodically check for new participants
        poll_count = 0
        while self.running:
            await asyncio.sleep(5)
            poll_count += 1
            
            # Every 30 seconds, check for new rooms to join
            if poll_count % 6 == 0:
                await self.discover_and_join_rooms()
            
            if poll_count % 1 == 0:
                for room_name, room in list(self.rooms.items()):
                    try:
                        participants = list(room.remote_participants.values())
                        
                        if poll_count % 6 == 0:
                            logger.info(f"📊 Room {room_name}: {len(participants)} participants, {len(self.processing_tracks)} being processed")
                        
                        for participant in participants:
                            participant_key = f"{room_name}_{participant.identity}"
                            
                            # Skip if this is the agent itself or another agent
                            if participant.identity.startswith(self.config.agent_identity):
                                continue
                            
                            if participant_key not in self.processing_tracks:
                                logger.info(f"🔍 Found new participant: {participant.identity}")
                                
                                for track_sid, publication in participant.track_publications.items():
                                    if publication.kind == rtc.TrackKind.KIND_AUDIO:
                                        if not publication.subscribed:
                                            logger.info(f"📡 Subscribing to audio from {participant.identity}")
                                            publication.set_subscribed(True)
                                            await asyncio.sleep(0.5)
                                        
                                        if publication.track and participant_key not in self.processing_tracks:
                                            logger.info(f"🚀 Starting DeepFilterNet processing for {participant.identity}")
                                            self.processing_tracks.add(participant_key)
                                            asyncio.create_task(
                                                self.process_audio_track(room_name, publication.track, participant, participant_key)
                                            )
                    except Exception as e:
                        logger.error(f"❌ Error polling room {room_name}: {e}")

    async def join_room(self, room_name: str) -> bool:
        """Join a specific room and start processing"""
        try:
            logger.info(f"🚪 Joining room: {room_name}")
            
            # Generate token
            token = api.AccessToken(
                self.config.livekit_api_key,
                self.config.livekit_api_secret
            )
            token.with_identity(f"{self.config.agent_identity}-{room_name}")
            token.with_name("DeepFilter Audio Processor")
            token.with_grants(api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                hidden=True  # Hide agent from participant list
            ))
            
            jwt_token = token.to_jwt()
            
            # Create and connect to room
            room = rtc.Room()
            self.rooms[room_name] = room
            
            # Set up event handlers
            @room.on("track_subscribed")
            def on_track_subscribed(
                track: rtc.Track,
                publication: rtc.RemoteTrackPublication,
                participant: rtc.RemoteParticipant,
            ):
                if track.kind == rtc.TrackKind.KIND_AUDIO:
                    participant_key = f"{room_name}_{participant.identity}"
                    
                    if participant_key in self.processing_tracks:
                        logger.warning(f"⚠️ Already processing {participant.identity}")
                        return
                    
                    self.processing_tracks.add(participant_key)
                    logger.info(f"🎤 Subscribed to audio from: {participant.identity}")
                    asyncio.create_task(
                        self.process_audio_track(room_name, track, participant, participant_key)
                    )

            @room.on("track_unsubscribed")
            def on_track_unsubscribed(
                track: rtc.Track,
                publication: rtc.RemoteTrackPublication,
                participant: rtc.RemoteParticipant,
            ):
                participant_key = f"{room_name}_{participant.identity}"
                if participant_key in self.processing_tracks:
                    self.processing_tracks.remove(participant_key)
                logger.info(f"🔇 Unsubscribed from: {participant.identity}")

            # Connect to room
            await room.connect(self.config.livekit_url, jwt_token)
            logger.info(f"✅ Connected to room: {room_name}")
            
            # Check for existing participants
            participants = list(room.remote_participants.values())
            logger.info(f"📊 Found {len(participants)} existing participants")
            
            for participant in participants:
                # Skip if this is the agent itself or another agent
                if participant.identity.startswith(self.config.agent_identity):
                    logger.info(f"⏭️ Skipping agent participant: {participant.identity}")
                    continue
                    
                participant_key = f"{room_name}_{participant.identity}"
                
                for track_sid, publication in participant.track_publications.items():
                    if publication.kind == rtc.TrackKind.KIND_AUDIO:
                        if not publication.subscribed:
                            publication.set_subscribed(True)
                            await asyncio.sleep(0.5)
                        
                        if publication.track and participant_key not in self.processing_tracks:
                            logger.info(f"🎤 Processing existing participant: {participant.identity}")
                            self.processing_tracks.add(participant_key)
                            asyncio.create_task(
                                self.process_audio_track(room_name, publication.track, participant, participant_key)
                            )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to join room {room_name}: {e}")
            return False

    async def process_audio_track(
        self,
        room_name: str,
        track: rtc.RemoteAudioTrack,
        participant: rtc.RemoteParticipant,
        participant_key: str
    ):
        """Process audio track with DeepFilterNet"""
        try:
            logger.info(f"🎧 Starting DeepFilterNet processing for {participant.identity}")
            
            # Create processor
            processor_key = f"{room_name}_{participant.identity}"
            
            if processor_key not in self.processors:
                self.processors[processor_key] = DeepFilterProcessor(
                    sample_rate=self.config.sample_rate,
                    post_gain=self.config.post_gain,
                    attenuation_limit=self.config.attenuation_limit
                )
            
            processor = self.processors[processor_key]
            
            # Create audio source
            audio_source = rtc.AudioSource(
                self.config.sample_rate,
                self.config.channels
            )
            self.audio_sources[processor_key] = audio_source
            
            room = self.rooms[room_name]
            
            # Publish processed track
            track_options = TrackPublishOptions(
                source=rtc.TrackSource.SOURCE_MICROPHONE,
            )
            
            track_name = f"{participant.identity}_deepfiltered"
            cleaned_track = rtc.LocalAudioTrack.create_audio_track(
                track_name,
                audio_source
            )
            await room.local_participant.publish_track(cleaned_track, track_options)
            logger.info(f"🎙️ Publishing DeepFiltered track: {track_name}")
            
            # Process audio stream
            audio_stream = rtc.AudioStream(track)
            frame_count = 0
            
            async for audio_frame_event in audio_stream:
                frame = audio_frame_event.frame
                
                # Convert frame to numpy array
                audio_data = np.frombuffer(frame.data, dtype=np.int16)
                
                if frame_count == 0:
                    logger.info(f"🎤 First frame from {participant.identity}: {len(audio_data)} samples, {frame.sample_rate}Hz")
                
                frame_count += 1
                
                # Log audio levels periodically
                if frame_count % 100 == 0:
                    audio_level = np.abs(audio_data).mean()
                    if audio_level > 10:
                        logger.info(f"🔊 {participant.identity} audio level: {audio_level:.1f}")
                
                # Process with DeepFilterNet
                cleaned_data = processor.process(audio_data)
                
                # Ensure int16
                if cleaned_data.dtype != np.int16:
                    cleaned_data = (cleaned_data * 32768.0).clip(-32768, 32767).astype(np.int16)
                
                # Create output frame
                output_frame = AudioFrame(
                    data=cleaned_data.tobytes(),
                    sample_rate=self.config.sample_rate,
                    num_channels=self.config.channels,
                    samples_per_channel=len(cleaned_data)
                )
                
                # Capture to audio source
                await audio_source.capture_frame(output_frame)
            
            # Cleanup
            self.processing_tracks.discard(participant_key)
            logger.info(f"✅ Finished processing for {participant.identity}")
                    
        except Exception as e:
            logger.error(f"❌ Error processing audio: {e}", exc_info=True)
            self.processing_tracks.discard(participant_key)

    async def leave_room(self, room_name: str):
        """Leave a room and cleanup"""
        if room_name in self.rooms:
            room = self.rooms[room_name]
            await room.disconnect()
            del self.rooms[room_name]
            logger.info(f"👋 Left room: {room_name}")

    async def stop(self):
        """Stop the agent"""
        self.running = False
        for room_name in list(self.rooms.keys()):
            await self.leave_room(room_name)
        logger.info("🛑 Agent stopped")


async def health_check_server():
    """HTTP server for health checks"""
    async def health(request):
        return web.Response(text="OK")
    
    app = web.Application()
    app.router.add_get("/health", health)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    logger.info("🏥 Health check server started on port 8080")


async def main():
    """Main entry point"""
    # Load configuration
    config = AgentConfig(
        livekit_url=os.getenv("LIVEKIT_URL", "ws://localhost:7880"),
        livekit_api_key=os.getenv("LIVEKIT_API_KEY"),
        livekit_api_secret=os.getenv("LIVEKIT_API_SECRET"),
        post_gain=float(os.getenv("POST_GAIN", "1.0")),
        attenuation_limit=float(os.getenv("ATTENUATION_LIMIT", "100"))
    )
    
    if not config.livekit_api_key or not config.livekit_api_secret:
        logger.error("❌ Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET")
        return
    
    # Start health check server
    await health_check_server()
    
    # Create and start agent
    agent = AudioAgent(config)
    
    # Join rooms specified in environment or discover all active rooms
    rooms_to_join = os.getenv("LIVEKIT_ROOMS", "").split(",")
    rooms_to_join = [r.strip() for r in rooms_to_join if r.strip()]
    
    if rooms_to_join:
        logger.info(f"🎯 Joining specific rooms: {rooms_to_join}")
        for room_name in rooms_to_join:
            await agent.join_room(room_name)
    else:
        logger.info("🔍 Discovering active rooms...")
        await agent.discover_and_join_rooms()
        logger.info("🌐 Agent will continue monitoring for new rooms")
    
    # Start agent loop
    await agent.start()


if __name__ == "__main__":
    asyncio.run(main())
