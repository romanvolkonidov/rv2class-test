#!/usr/bin/env python3
"""
Test script for DeepFilterNet Audio Agent
Run this to verify your installation is working
"""

import sys
import os

def test_imports():
    """Test if all required packages are installed"""
    print("🧪 Testing package imports...")
    
    packages = [
        ('numpy', 'NumPy'),
        ('torch', 'PyTorch'),
        ('livekit', 'LiveKit SDK'),
        ('df.enhance', 'DeepFilterNet'),
    ]
    
    failed = []
    for package, name in packages:
        try:
            __import__(package)
            print(f"  ✅ {name}")
        except ImportError as e:
            print(f"  ❌ {name}: {e}")
            failed.append(name)
    
    if failed:
        print(f"\n❌ Missing packages: {', '.join(failed)}")
        print("Run: pip install -r requirements_deepfilter.txt")
        return False
    
    print("✅ All packages installed!\n")
    return True


def test_gpu():
    """Test GPU availability"""
    print("🎮 Testing GPU support...")
    
    try:
        import torch
        if torch.cuda.is_available():
            gpu_count = torch.cuda.device_count()
            gpu_name = torch.cuda.get_device_name(0)
            print(f"  ✅ GPU detected: {gpu_name}")
            print(f"  ✅ GPU count: {gpu_count}")
            print(f"  ✅ CUDA version: {torch.version.cuda}")
            return True
        else:
            print("  ℹ️  No GPU detected (CPU mode)")
            print("  ℹ️  Processing will work but be slower")
            return True
    except Exception as e:
        print(f"  ⚠️  GPU test failed: {e}")
        return True


def test_model_download():
    """Test DeepFilterNet model download"""
    print("🤖 Testing DeepFilterNet model...")
    
    try:
        from df.enhance import init_df
        print("  ⏳ Initializing model (this may take a moment)...")
        model, df_state, _ = init_df()
        print("  ✅ DeepFilterNet model loaded successfully!")
        
        # Test model on dummy data
        import torch
        import numpy as np
        
        dummy_audio = torch.randn(1, 48000).float()  # 1 second of audio
        print("  🧪 Testing model inference...")
        
        with torch.no_grad():
            from df.enhance import enhance
            result = enhance(model, df_state, dummy_audio, atten_lim_db=100)
        
        print("  ✅ Model inference working!")
        print(f"  ✅ Input shape: {dummy_audio.shape}")
        print(f"  ✅ Output shape: {result.shape}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Model test failed: {e}")
        print(f"  💡 Try: python -c 'from df.enhance import init_df; init_df()'")
        return False


def test_livekit_config():
    """Test LiveKit configuration"""
    print("🔧 Testing LiveKit configuration...")
    
    required_vars = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']
    missing = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value or value == f'your_{var.lower()}':
            missing.append(var)
            print(f"  ❌ {var} not set")
        else:
            # Show partial value for security
            display = f"{value[:10]}..." if len(value) > 10 else value
            print(f"  ✅ {var}: {display}")
    
    if missing:
        print(f"\n⚠️  Missing configuration: {', '.join(missing)}")
        print("Please set these in your .env file")
        return False
    
    print("✅ LiveKit configuration complete!\n")
    return True


def test_audio_processing():
    """Test audio processing pipeline"""
    print("🎵 Testing audio processing...")
    
    try:
        import numpy as np
        from df.enhance import init_df, enhance
        import torch
        
        # Create test audio (1 second, 48kHz, noise + tone)
        print("  🔊 Creating test audio with noise...")
        duration = 1.0
        sample_rate = 48000
        samples = int(duration * sample_rate)
        
        # Generate noise
        noise = np.random.randn(samples) * 0.1
        
        # Generate clean tone (440 Hz)
        t = np.linspace(0, duration, samples)
        tone = 0.5 * np.sin(2 * np.pi * 440 * t)
        
        # Mix
        noisy_audio = tone + noise
        
        print("  📊 Input stats:")
        print(f"     Samples: {len(noisy_audio)}")
        print(f"     Range: [{noisy_audio.min():.3f}, {noisy_audio.max():.3f}]")
        print(f"     Mean: {noisy_audio.mean():.3f}")
        
        # Process with DeepFilterNet
        print("  ⏳ Processing with DeepFilterNet...")
        model, df_state, _ = init_df()
        
        audio_tensor = torch.from_numpy(noisy_audio).float().unsqueeze(0)
        
        with torch.no_grad():
            clean_audio = enhance(model, df_state, audio_tensor, atten_lim_db=100)
        
        clean_audio = clean_audio.squeeze(0).numpy()
        
        print("  📊 Output stats:")
        print(f"     Samples: {len(clean_audio)}")
        print(f"     Range: [{clean_audio.min():.3f}, {clean_audio.max():.3f}]")
        print(f"     Mean: {clean_audio.mean():.3f}")
        
        # Calculate noise reduction
        noise_reduction = 20 * np.log10(np.abs(noisy_audio).mean() / np.abs(clean_audio - tone).mean())
        print(f"  ✅ Noise reduction: {noise_reduction:.1f} dB")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Audio processing test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("="*50)
    print("🧪 DeepFilterNet Audio Agent Test Suite")
    print("="*50)
    print()
    
    tests = [
        ("Package imports", test_imports),
        ("GPU support", test_gpu),
        ("Model download", test_model_download),
        ("LiveKit config", test_livekit_config),
        ("Audio processing", test_audio_processing),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ Test '{name}' crashed: {e}")
            results.append((name, False))
        print()
    
    # Summary
    print("="*50)
    print("📊 Test Summary")
    print("="*50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print()
        print("🎉 All tests passed! You're ready to run the agent!")
        print()
        print("Next steps:")
        print("1. Configure .env with your LiveKit credentials")
        print("2. Run: python deepfilter_agent.py")
        print("3. Enjoy crystal-clear audio!")
        return 0
    else:
        print()
        print("⚠️  Some tests failed. Please fix the issues above.")
        print()
        print("Need help? Check DEEPFILTER_SETUP.md")
        return 1


if __name__ == "__main__":
    sys.exit(main())
