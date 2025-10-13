#!/usr/bin/env python3
"""
Deep diagnosis of LiveKit server state
"""
import asyncio
import os
from livekit import api

async def diagnose():
    """Diagnose LiveKit server"""
    
    # Load from environment
    livekit_url = os.getenv("LIVEKIT_URL")
    livekit_api_key = os.getenv("LIVEKIT_API_KEY")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    print(f"🔍 LiveKit Server Diagnosis")
    print(f"=" * 60)
    print(f"URL: {livekit_url}")
    print()
    
    try:
        # Create API client
        lkapi = api.LiveKitAPI(
            livekit_url,
            livekit_api_key,
            livekit_api_secret
        )
        
        # Test 1: List ALL rooms (including empty)
        print("📋 TEST 1: List ALL rooms")
        print("-" * 60)
        rooms_list = await lkapi.room.list_rooms(api.ListRoomsRequest())
        
        print(f"Total rooms found: {len(rooms_list.rooms)}")
        
        if len(rooms_list.rooms) == 0:
            print("⚠️  NO ROOMS FOUND AT ALL!")
            print("   This means either:")
            print("   1. No active rooms exist")
            print("   2. API credentials don't have permission")
            print("   3. LiveKit server is not properly configured")
        else:
            for room_info in rooms_list.rooms:
                print(f"\n📍 Room: {room_info.name}")
                print(f"   SID: {room_info.sid}")
                print(f"   Participants: {room_info.num_participants}")
                print(f"   Max participants: {room_info.max_participants}")
                print(f"   Created: {room_info.creation_time}")
                print(f"   Empty timeout: {room_info.empty_timeout}")
        
        print("\n")
        
        # Test 2: Try to create a test token and see if it works
        print("🎫 TEST 2: Generate a test token")
        print("-" * 60)
        
        test_room = "test-diagnosis-room"
        token = api.AccessToken(livekit_api_key, livekit_api_secret)
        token.with_identity("test-participant")
        token.with_name("Test User")
        token.with_grants(api.VideoGrants(
            room_join=True,
            room=test_room,
            can_publish=True,
            can_subscribe=True,
        ))
        jwt_token = token.to_jwt()
        print(f"✅ Token generated successfully for room: {test_room}")
        print(f"   Token starts with: {jwt_token[:50]}...")
        
        print("\n")
        
        # Test 3: Check specific rooms that user mentioned
        print("🔎 TEST 3: Check user's rooms")
        print("-" * 60)
        
        test_rooms = ["roman-148272", "roman-room", "roman-585462"]
        
        for room_name in test_rooms:
            try:
                participants = await lkapi.room.list_participants(
                    api.ListParticipantsRequest(room=room_name)
                )
                
                print(f"\n📍 Room: {room_name}")
                print(f"   Status: EXISTS")
                print(f"   Participants: {len(participants.participants)}")
                
                if len(participants.participants) > 0:
                    for p in participants.participants:
                        print(f"      - {p.identity} (Hidden: {p.is_hidden}, State: {p.state})")
                else:
                    print(f"      ⚠️  No participants found!")
                    
            except Exception as e:
                print(f"\n📍 Room: {room_name}")
                print(f"   Status: DOES NOT EXIST or ERROR")
                print(f"   Error: {e}")
        
        print("\n")
        
        # Test 4: Check LiveKit server health
        print("🏥 TEST 4: Server configuration check")
        print("-" * 60)
        print(f"API Key: {livekit_api_key}")
        print(f"API Secret length: {len(livekit_api_secret) if livekit_api_secret else 0} chars")
        print(f"Using wss:// (secure): {livekit_url.startswith('wss://')}")
        
        # Close API client
        await lkapi.aclose()
        
        print("\n" + "=" * 60)
        print("✅ Diagnosis completed")
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(diagnose())
