import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Volume2, VolumeX, RotateCcw, Languages } from 'lucide-react-native';
import { VoiceService } from '@/services/VoiceService';
import { NavigationInstruction } from '@/services/NavigationService';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceGuidanceProps {
  currentInstruction: NavigationInstruction | null;
  nextInstruction: NavigationInstruction | null;
  distanceToNext: number;
  isNavigating: boolean;
  onToggleMute?: (isMuted: boolean) => void;
}

export default function VoiceGuidance({
  currentInstruction,
  nextInstruction,
  distanceToNext,
  isNavigating,
  onToggleMute,
}: VoiceGuidanceProps) {
  const { language } = useLanguage();
  const [isMuted, setIsMuted] = useState(false);
  const [lastSpokenInstruction, setLastSpokenInstruction] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const instructionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize voice service
  useEffect(() => {
    const initializeVoice = async () => {
      try {
        await VoiceService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Voice service initialization failed:', error);
        Alert.alert(
          'Voice Guidance Unavailable',
          'Text-to-speech is not available on this device. Navigation will continue without voice guidance.',
          [{ text: 'OK' }]
        );
      }
    };

    initializeVoice().catch((error) => {
      console.error('Voice initialization failed:', error);
      setIsInitialized(false);
    });

    return () => {
      VoiceService.stop();
      if (instructionTimeoutRef.current) {
        clearTimeout(instructionTimeoutRef.current);
      }
    };
  }, []);

  // Handle instruction changes
  useEffect(() => {
    if (!isInitialized || !isNavigating || isMuted || !currentInstruction) {
      return;
    }

    // Determine when to speak based on distance
    const shouldSpeak = 
      distanceToNext <= 100 || // Within 100 meters
      (distanceToNext <= 500 && currentInstruction.text !== lastSpokenInstruction); // New instruction within 500m

    if (shouldSpeak) {
      speakInstruction(currentInstruction, distanceToNext);
    }
  }, [currentInstruction, distanceToNext, isNavigating, isMuted, isInitialized]);

  const speakInstruction = async (instruction: NavigationInstruction, distance: number) => {
    try {
      let instructionText = '';
      
      if (distance <= 50) {
        instructionText = instruction.text;
      } else if (distance <= 100) {
        instructionText = `In ${Math.round(distance)} meters, ${instruction.text}`;
      } else {
        instructionText = `In ${Math.round(distance / 50) * 50} meters, ${instruction.text}`;
      }

      await VoiceService.speak(instructionText, language);
      setLastSpokenInstruction(instruction.text);
    } catch (error) {
      console.error('Failed to speak instruction:', error);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    onToggleMute?.(newMutedState);

    if (newMutedState) {
      VoiceService.stop();
    } else if (currentInstruction) {
      // Speak current instruction when unmuting
      speakInstruction(currentInstruction, distanceToNext);
    }
  };

  const repeatInstruction = () => {
    if (currentInstruction && !isMuted && isInitialized) {
      speakInstruction(currentInstruction, distanceToNext);
    }
  };

  const getDistanceColor = (distance: number) => {
    if (distance <= 50) return '#EF4444'; // Red - immediate
    if (distance <= 100) return '#F59E0B'; // Orange - soon
    if (distance <= 500) return '#3B82F6'; // Blue - upcoming
    return '#6B7280'; // Gray - distant
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  if (!isNavigating || !currentInstruction) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.instructionCard}>
        <View style={styles.instructionHeader}>
          <View style={styles.distanceContainer}>
            <Text style={[
              styles.distanceText,
              { color: getDistanceColor(distanceToNext) }
            ]}>
              {formatDistance(distanceToNext)}
            </Text>
            <Text style={styles.distanceLabel}>to turn</Text>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={repeatInstruction}
              disabled={!isInitialized || isMuted}
            >
              <RotateCcw size={18} color={!isInitialized || isMuted ? '#D1D5DB' : '#6B7280'} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.controlButton,
                isMuted && styles.mutedButton,
              ]} 
              onPress={toggleMute}
            >
              {isMuted ? (
                <VolumeX size={18} color="#EF4444" />
              ) : (
                <Volume2 size={18} color="#10B981" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.instructionContent}>
          <Text style={styles.instructionText}>
            {currentInstruction.text}
          </Text>
          
          {currentInstruction.streetName && (
            <Text style={styles.streetName}>
              on {currentInstruction.streetName}
            </Text>
          )}
        </View>
        
        {nextInstruction && distanceToNext <= 200 && (
          <View style={styles.nextInstructionContainer}>
            <Text style={styles.nextInstructionLabel}>Then:</Text>
            <Text style={styles.nextInstructionText}>
              {nextInstruction.text}
            </Text>
          </View>
        )}

        {/* Language indicator */}
        <View style={styles.languageIndicator}>
          <Languages size={12} color="#9CA3AF" />
          <Text style={styles.languageText}>
            {language === 'en' ? 'English' : 'မြန်မာ'}
          </Text>
        </View>
      </View>

      {/* Muted indicator */}
      {isMuted && (
        <View style={styles.mutedIndicator}>
          <VolumeX size={16} color="#EF4444" />
          <Text style={styles.mutedText}>Voice guidance muted</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  instructionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  instructionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceContainer: {
    alignItems: 'flex-start',
  },
  distanceText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  distanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedButton: {
    backgroundColor: '#FEE2E2',
  },
  instructionContent: {
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 24,
  },
  streetName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  nextInstructionContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  nextInstructionLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  nextInstructionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  languageText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  mutedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'center',
    gap: 6,
  },
  mutedText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});