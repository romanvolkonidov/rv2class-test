#!/usr/bin/env python3
"""
LiveKit Audio Routing Checker
Verifies that participants only hear processed audio from the agent
"""

import asyncio
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from livekit import api

# Load environment variables
load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")


def print_header(text: str):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_section(text: str):
    """Print a section header"""
    print(f"\n{'─' * 80}")
    print(f"  {text}")
    print(f"{'─' * 80}")


async def check_room_audio_routing(room_name: str):
    """Check audio track subscriptions and routing in a specific room"""
    try:
        # Create LiveKit API client
        lkapi = api.LiveKitAPI(
            LIVEKIT_URL.replace('ws://', 'http://').replace('wss://', 'https://'),
            LIVEKIT_API_KEY,
            LIVEKIT_API_SECRET,
        )
        
        print_header(f"Analyzing Room: {room_name}")
        print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Get room info
        list_request = api.ListRoomsRequest(names=[room_name])
        response = await lkapi.room.list_rooms(list_request)
        rooms = response.rooms if hasattr(response, 'rooms') else []
        
        if not rooms:
            print(f"❌ Room '{room_name}' not found or empty")
            return
        
        room = rooms[0]
        print(f"\n📊 Room Details:")
        print(f"   • Name: {room.name}")
        print(f"   • SID: {room.sid}")
        print(f"   • Participants: {room.num_participants}")
        print(f"   • Created: {datetime.fromtimestamp(room.creation_time).strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Get participants
        list_participants_request = api.ListParticipantsRequest(room=room.name)
        participants_response = await lkapi.room.list_participants(list_participants_request)
        participants = participants_response.participants if hasattr(participants_response, 'participants') else []
        
        print_section("Participants & Audio Tracks")
        
        agent_participants = []
        user_participants = []
        
        for p in participants:
            if 'deepfilter-agent' in p.identity.lower():
                agent_participants.append(p)
            else:
                user_participants.append(p)
        
        # Analyze agent participants
        if agent_participants:
            print("\n🤖 AGENT PARTICIPANTS:")
            for p in agent_participants:
                print(f"\n   Identity: {p.identity}")
                print(f"   SID: {p.sid}")
                print(f"   Is Publisher: {p.is_publisher}")
                
                audio_tracks = [t for t in p.tracks if t.type == api.TrackType.AUDIO]
                if audio_tracks:
                    print(f"   📢 Published Audio Tracks ({len(audio_tracks)}):")
                    for track in audio_tracks:
                        print(f"      • Name: {track.name}")
                        print(f"        SID: {track.sid}")
                        print(f"        Muted: {track.muted}")
                        print(f"        Source: {track.source}")
                else:
                    print("   ⚠️  No audio tracks published by agent")
        else:
            print("\n⚠️  NO AGENT FOUND IN ROOM")
            print("   ⚠️  Users may be hearing RAW (unprocessed) audio!")
        
        # Analyze user participants
        if user_participants:
            print("\n👥 USER PARTICIPANTS:")
            for p in user_participants:
                print(f"\n   Identity: {p.identity}")
                print(f"   SID: {p.sid}")
                print(f"   State: {p.state}")
                
                # Check published tracks
                audio_tracks = [t for t in p.tracks if t.type == api.TrackType.AUDIO]
                video_tracks = [t for t in p.tracks if t.type == api.TrackType.VIDEO]
                
                if audio_tracks:
                    print(f"   🎤 Published Audio Tracks ({len(audio_tracks)}):")
                    for track in audio_tracks:
                        is_original = not '_deepfiltered' in track.name
                        emoji = "🔴" if is_original else "✅"
                        print(f"      {emoji} Name: {track.name}")
                        print(f"        SID: {track.sid}")
                        print(f"        Muted: {track.muted}")
                        print(f"        Source: {track.source}")
                        if is_original:
                            print(f"        ⚠️  ORIGINAL TRACK - Should be replaced by agent!")
                
                if video_tracks:
                    print(f"   📹 Published Video Tracks ({len(video_tracks)}):")
                    for track in video_tracks:
                        print(f"      • Name: {track.name}")
                        print(f"        SID: {track.sid}")
        
        # Analysis Summary
        print_section("Audio Routing Analysis")
        
        # Count tracks
        total_original_audio = 0
        total_filtered_audio = 0
        user_identities = set()
        
        for p in user_participants:
            user_identities.add(p.identity)
            for track in p.tracks:
                if track.type == api.TrackType.AUDIO:
                    if '_deepfiltered' in track.name:
                        total_filtered_audio += 1
                    else:
                        total_original_audio += 1
        
        for p in agent_participants:
            for track in p.tracks:
                if track.type == api.TrackType.AUDIO and '_deepfiltered' in track.name:
                    total_filtered_audio += 1
        
        print(f"\n📊 Summary:")
        print(f"   • Total users: {len(user_participants)}")
        print(f"   • Original audio tracks: {total_original_audio}")
        print(f"   • Filtered audio tracks: {total_filtered_audio}")
        
        # Check if filtering is working correctly
        print(f"\n🔍 Routing Status:")
        
        if len(agent_participants) == 0:
            print(f"   ❌ NO AGENT PRESENT")
            print(f"   ⚠️  All users hear RAW (unprocessed) audio!")
            return
        
        if total_filtered_audio < len(user_identities):
            print(f"   ⚠️  INCOMPLETE PROCESSING")
            print(f"   ⚠️  Expected {len(user_identities)} filtered tracks, found {total_filtered_audio}")
            print(f"   ⚠️  Some users may hear unprocessed audio!")
        elif total_filtered_audio == len(user_identities):
            print(f"   ✅ FULLY PROCESSED")
            print(f"   ✅ All {len(user_identities)} users have filtered audio tracks")
            print(f"   ✅ Users should ONLY hear noise-suppressed audio!")
        elif total_filtered_audio > len(user_identities):
            print(f"   ✅ FULLY PROCESSED (with redundancy)")
            print(f"   ✅ All users have filtered tracks")
        
        # Check for original tracks that shouldn't be there
        if total_original_audio > 0:
            print(f"\n   ℹ️  Note: {total_original_audio} original audio tracks still present")
            print(f"   ℹ️  These should be MUTED or UNSUBSCRIBED on the client side")
            print(f"   ℹ️  Client filter logic prevents these from being heard")
        
        await lkapi.aclose()
        
    except Exception as e:
        print(f"\n❌ Error checking room: {e}")
        import traceback
        traceback.print_exc()


async def check_all_active_rooms():
    """Check audio routing for all active rooms"""
    try:
        # Create LiveKit API client
        lkapi = api.LiveKitAPI(
            LIVEKIT_URL.replace('ws://', 'http://').replace('wss://', 'https://'),
            LIVEKIT_API_KEY,
            LIVEKIT_API_SECRET,
        )
        
        print_header("LiveKit Audio Routing Checker")
        print(f"🔗 Server: {LIVEKIT_URL}")
        
        # List all rooms
        list_request = api.ListRoomsRequest()
        response = await lkapi.room.list_rooms(list_request)
        rooms = response.rooms if hasattr(response, 'rooms') else []
        
        if not rooms:
            print("\n📭 No active rooms found")
            await lkapi.aclose()
            return
        
        print(f"\n📋 Found {len(rooms)} active room(s)")
        
        await lkapi.aclose()
        
        # Check each room
        for room in rooms:
            await check_room_audio_routing(room.name)
        
        print("\n" + "=" * 80)
        print("  Analysis Complete")
        print("=" * 80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


async def main():
    """Main entry point"""
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        print("❌ Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET in .env file")
        sys.exit(1)
    
    # Check for specific room name argument
    if len(sys.argv) > 1:
        room_name = sys.argv[1]
        await check_room_audio_routing(room_name)
    else:
        # Check all rooms
        await check_all_active_rooms()


if __name__ == "__main__":
    asyncio.run(main())
