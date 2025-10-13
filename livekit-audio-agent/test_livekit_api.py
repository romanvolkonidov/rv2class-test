#!/usr/bin/env python3
"""
Test script to verify LiveKit API connectivity and list active rooms
"""
import asyncio
import os
from livekit import api

async def test_api():
    """Test LiveKit API connection"""
    
    # Load from environment
    livekit_url = os.getenv("LIVEKIT_URL")
    livekit_api_key = os.getenv("LIVEKIT_API_KEY")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    print(f"🔍 Testing LiveKit API connection...")
    print(f"   URL: {livekit_url}")
    print(f"   API Key: {livekit_api_key}")
    print(f"   API Secret: {'*' * 20}...{livekit_api_secret[-4:] if livekit_api_secret else 'MISSING'}")
    print()
    
    if not livekit_api_key or not livekit_api_secret:
        print("❌ Missing API credentials!")
        return
    
    try:
        # Create API client
        lkapi = api.LiveKitAPI(
            livekit_url,
            livekit_api_key,
            livekit_api_secret
        )
        
        print("✅ API client created successfully")
        print()
        
        # List all active rooms
        print("📋 Listing all active rooms...")
        rooms_list = await lkapi.room.list_rooms(api.ListRoomsRequest())
        
        print(f"✅ Found {len(rooms_list.rooms)} total rooms")
        print()
        
        for room_info in rooms_list.rooms:
            print(f"📍 Room: {room_info.name}")
            print(f"   Participants: {room_info.num_participants}")
            print(f"   Created: {room_info.creation_time}")
            print(f"   SID: {room_info.sid}")
            print()
            
            # Get detailed participant info
            if room_info.num_participants > 0:
                print(f"   👥 Getting participants for {room_info.name}...")
                participants = await lkapi.room.list_participants(
                    api.ListParticipantsRequest(room=room_info.name)
                )
                
                for participant in participants.participants:
                    print(f"      - {participant.identity} ({participant.state})")
                    print(f"        Joined: {participant.joined_at}")
                    print(f"        Hidden: {participant.is_hidden}")
                print()
        
        # Close API client
        await lkapi.aclose()
        print("✅ Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_api())
