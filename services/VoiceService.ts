import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface VoiceOptions {
  rate?: number;
  pitch?: number;
  language?: string;
  voice?: string;
}

export class VoiceService {
  private static isInitialized = false;
  private static currentLanguage: 'en' | 'my' = 'en';
  private static isSpeaking = false;

  /**
   * Initialize the voice service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if speech is available
      const isAvailable = await Speech.isSpeakingAsync();
      
      this.isInitialized = true;
      console.log('Voice service initialized successfully');
    } catch (error) {
      console.error('Voice service initialization failed:', error);
      throw new Error('Text-to-speech not available on this device');
    }
  }

  /**
   * Speak text with language support
   */
  static async speak(
    text: string, 
    language: 'en' | 'my' = 'en',
    options: VoiceOptions = {}
  ): Promise<void> {
    try {
      await this.initialize();

      // Stop any current speech
      if (this.isSpeaking) {
        await this.stop();
      }

      // Translate text if needed
      const translatedText = language === 'my' ? this.translateToMyanmar(text) : text;
      
      // Configure speech options
      const speechOptions: Speech.SpeechOptions = {
        language: this.getLanguageCode(language),
        pitch: options.pitch || 1.0,
        rate: options.rate || 0.6, // Slightly slower for navigation
        voice: options.voice,
        onStart: () => {
          this.isSpeaking = true;
        },
        onDone: () => {
          this.isSpeaking = false;
        },
        onStopped: () => {
          this.isSpeaking = false;
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.isSpeaking = false;
        },
      };

      await Speech.speak(translatedText, speechOptions);
    } catch (error) {
      console.error('Speech failed:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Stop current speech
   */
  static async stop(): Promise<void> {
    try {
      await Speech.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('Failed to stop speech:', error);
    }
  }

  /**
   * Check if currently speaking
   */
  static async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      return this.isSpeaking;
    }
  }

  /**
   * Get available voices for language
   */
  static async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      if (Platform.OS === 'ios') {
        return await Speech.getAvailableVoicesAsync();
      }
      return [];
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return [];
    }
  }

  /**
   * Set voice language
   */
  static setLanguage(language: 'en' | 'my'): void {
    this.currentLanguage = language;
  }

  /**
   * Get language code for speech synthesis
   */
  private static getLanguageCode(language: 'en' | 'my'): string {
    switch (language) {
      case 'my':
        return 'my-MM'; // Myanmar (Burma)
      case 'en':
      default:
        return 'en-US'; // English (US)
    }
  }

  /**
   * Translate navigation instructions to Myanmar
   */
  private static translateToMyanmar(text: string): string {
    // Navigation instruction translations
    const translations: Record<string, string> = {
      // Basic directions
      'Turn left': 'ဘယ်ဘက်ကွေ့ပါ',
      'Turn right': 'ညာဘက်ကွေ့ပါ',
      'Go straight': 'တည့်တည့်သွားပါ',
      'Continue straight': 'ဆက်လက်တည့်တည့်သွားပါ',
      'Make a U-turn': 'ပြန်လှည့်ပါ',
      
      // Distance indicators
      'In 100 meters': '၁၀၀ မီတာအကွာတွင်',
      'In 200 meters': '၂၀၀ မီတာအကွာတွင်',
      'In 500 meters': '၅၀၀ မီတာအကွာတွင်',
      'In 1 kilometer': '၁ ကီလိုမီတာအကွာတွင်',
      
      // Arrival
      'You have arrived': 'ရောက်ပြီးပါပြီ',
      'Destination reached': 'ခရီးဆုံးရောက်ပြီးပါပြီ',
      'You have reached your destination': 'သင့်ခရီးဆုံးသို့ ရောက်ရှိပြီးပါပြီ',
      
      // Highway and road types
      'highway': 'အဝေးပြေးလမ်း',
      'road': 'လမ်း',
      'street': 'လမ်း',
      'avenue': 'လမ်းမကြီး',
      
      // Common navigation phrases
      'Keep left': 'ဘယ်ဘက်ကပ်၍သွားပါ',
      'Keep right': 'ညာဘက်ကပ်၍သွားပါ',
      'Take the exit': 'ထွက်ပေါက်ကိုယူပါ',
      'Enter the roundabout': 'လမ်းပတ်ကွင်းထဲဝင်ပါ',
      'Exit the roundabout': 'လမ်းပတ်ကွင်းမှထွက်ပါ',
      
      // Traffic and warnings
      'Heavy traffic ahead': 'ရှေ့တွင်ယာဉ်ကြောပိတ်ဆို့နေပါသည်',
      'Slow down': 'အမြန်နှုန်းလျှော့ပါ',
      'Speed up': 'အမြန်နှုန်းမြှင့်ပါ',
      
      // Numbers (for distances)
      '1': '၁', '2': '၂', '3': '၃', '4': '၄', '5': '၅',
      '6': '၆', '7': '၇', '8': '၈', '9': '၉', '0': '၀',
    };

    let translated = text;

    // Replace English phrases with Myanmar equivalents
    Object.entries(translations).forEach(([english, myanmar]) => {
      const regex = new RegExp(english, 'gi');
      translated = translated.replace(regex, myanmar);
    });

    // Convert numbers to Myanmar numerals
    translated = translated.replace(/\d/g, (digit) => {
      return translations[digit] || digit;
    });

    return translated;
  }

  /**
   * Speak navigation instruction with appropriate timing
   */
  static async speakNavigationInstruction(
    instruction: string,
    distance: number,
    language: 'en' | 'my' = 'en'
  ): Promise<void> {
    let fullInstruction = '';

    if (distance <= 50) {
      fullInstruction = instruction;
    } else if (distance <= 100) {
      const distanceText = language === 'my' ? 
        `${Math.round(distance)} မီတာအကွာတွင်` : 
        `In ${Math.round(distance)} meters`;
      fullInstruction = `${distanceText}, ${instruction}`;
    } else if (distance <= 500) {
      const roundedDistance = Math.round(distance / 50) * 50;
      const distanceText = language === 'my' ? 
        `${roundedDistance} မီတာအကွာတွင်` : 
        `In ${roundedDistance} meters`;
      fullInstruction = `${distanceText}, ${instruction}`;
    } else {
      const kmDistance = (distance / 1000).toFixed(1);
      const distanceText = language === 'my' ? 
        `${kmDistance} ကီလိုမီတာအကွာတွင်` : 
        `In ${kmDistance} kilometers`;
      fullInstruction = `${distanceText}, ${instruction}`;
    }

    await this.speak(fullInstruction, language, {
      rate: 0.7, // Slightly slower for navigation instructions
      pitch: 1.0,
    });
  }

  /**
   * Announce arrival
   */
  static async announceArrival(language: 'en' | 'my' = 'en'): Promise<void> {
    const message = language === 'my' ? 
      'သင့်ခရီးဆုံးသို့ ရောက်ရှိပြီးပါပြီ' : 
      'You have arrived at your destination';
    
    await this.speak(message, language, {
      rate: 0.8,
      pitch: 1.1,
    });
  }

  /**
   * Announce route calculation
   */
  static async announceRouteCalculated(
    distance: string,
    duration: string,
    language: 'en' | 'my' = 'en'
  ): Promise<void> {
    const message = language === 'my' ? 
      `လမ်းကြောင်းတွက်ချက်ပြီးပါပြီ။ အကွာအဝေး ${distance}၊ ခန့်မှန်းချိန် ${duration}` :
      `Route calculated. Distance ${distance}, estimated time ${duration}`;
    
    await this.speak(message, language);
  }

  /**
   * Announce traffic warning
   */
  static async announceTrafficWarning(
    severity: 'light' | 'moderate' | 'heavy',
    language: 'en' | 'my' = 'en'
  ): Promise<void> {
    let message = '';
    
    if (language === 'my') {
      switch (severity) {
        case 'light':
          message = 'ရှေ့တွင် ယာဉ်အနည်းငယ်ပိတ်ဆို့နေပါသည်';
          break;
        case 'moderate':
          message = 'ရှေ့တွင် ယာဉ်အတန်အသင့်ပိတ်ဆို့နေပါသည်';
          break;
        case 'heavy':
          message = 'ရှေ့တွင် ယာဉ်များစွာပိတ်ဆို့နေပါသည်';
          break;
      }
    } else {
      switch (severity) {
        case 'light':
          message = 'Light traffic ahead';
          break;
        case 'moderate':
          message = 'Moderate traffic ahead';
          break;
        case 'heavy':
          message = 'Heavy traffic ahead, consider alternative route';
          break;
      }
    }
    
    await this.speak(message, language);
  }
}