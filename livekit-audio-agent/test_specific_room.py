#!/usr/bin/env python3
"""
Test script to check a specific room
"""
import asyncio
import os
from livekit import api

async def test_room(room_name):
    """Test specific room"""
    
    # Load from environment
    livekit_url = os.getenv("LIVEKIT_URL")
    livekit_api_key = os.getenv("LIVEKIT_API_KEY")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    print(f"🔍 Testing specific room: {room_name}")
    print(f"   URL: {livekit_url}")
    print()
    
    try:
        # Create API client
        lkapi = api.LiveKitAPI(
            livekit_url,
            livekit_api_key,
            livekit_api_secret
        )
        
        # Try to list participants in this specific room
        print(f"👥 Getting participants for room: {room_name}")
        try:
            participants = await lkapi.room.list_participants(
                api.ListParticipantsRequest(room=room_name)
            )
            
            print(f"✅ Room EXISTS with {len(participants.participants)} participants:")
            for participant in participants.participants:
                print(f"   - {participant.identity}")
                print(f"     State: {participant.state}")
                print(f"     Hidden: {participant.is_hidden}")
                print(f"     Joined: {participant.joined_at}")
            
        except Exception as e:
            print(f"❌ Room doesn't exist or error: {e}")
        
        # Close API client
        await lkapi.aclose()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    room_name = "roman-329551"  # Current room
    asyncio.run(test_room(room_name))
