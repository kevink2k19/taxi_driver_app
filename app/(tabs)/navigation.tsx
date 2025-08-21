import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  BackHandler,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Navigation as NavigationIcon,
  Play,
  Pause,
  Square,
  Clock,
  DollarSign,
  Zap,
  MapPin,
  Phone,
  ArrowLeft,
  Star,
  X,
  Plus,
  RotateCcw,
  TrendingUp,
  Calculator,
  Settings,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import DropoffDialog from '@/components/DropoffDialog';
import DemandModal from '@/components/DemandModal';

const { width, height } = Dimensions.get('window');

interface OrderData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  destination: string;
  fareAmount: number;
  distance: string;
  estimatedDuration: string;
  customerRating: number;
}

interface TripState {
  status: 'idle' | 'active' | 'resting' | 'completed';
  startTime: number | null;
  restStartTime: number | null;
  totalRestTime: number;
}

const BASE_FARE = 2000; // Base fare in MMK
const FARE_RATE = 600; // MMK per km
const INITIAL_DISTANCE = 0.1; // Starting distance in km

// Navigation tabs configuration
const NAVIGATION_TABS = [
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'demand', label: 'Demand', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'calculator', label: 'Calculator', icon: Calculator },
];

// Price options for cumulative selection
const PRICE_OPTIONS = [
  { value: 500, label: '500', color: '#10B981', description: 'Low increment' },
  { value: 1000, label: '1000', color: '#F59E0B', description: 'Medium increment' },
  { value: 2000, label: '2000', color: '#EF4444', description: 'High increment' },
  { value: 5000, label: '5000', color: '#8B5CF6', description: 'Premium increment' },
];

export default function NavigationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract order details from navigation params (optional - may be empty)
  const orderData: OrderData = {
    orderId: params.orderId as string || '',
    customerName: params.customerName as string || '',
    customerPhone: params.customerPhone as string || '',
    pickupLocation: params.pickupLocation as string || '',
    destination: params.destination as string || '',
    fareAmount: params.fareAmount ? parseInt(params.fareAmount as string) : 0,
    distance: params.distance as string || '',
    estimatedDuration: params.estimatedDuration as string || '',
    customerRating: params.customerRating ? parseFloat(params.customerRating as string) : 0,
  };

  // Check if we have complete order data
  const hasCompleteOrderData = orderData.orderId && orderData.customerName && 
    orderData.customerPhone && orderData.pickupLocation && orderData.destination;

  // Enhanced phone call handler with comprehensive error handling
  const handleCallCustomer = async () => {
    if (!orderData.customerPhone) {
      Alert.alert(
        'Error',
        'Customer phone number is not available.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      // Validate phone number format
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(orderData.customerPhone)) {
        Alert.alert(
          'Invalid Phone Number',
          'The customer phone number appears to be invalid.',
          [
            { text: 'OK' },
            { 
              text: 'Show Number', 
              onPress: () => Alert.alert('Customer Phone', orderData.customerPhone)
            }
          ]
        );
        return;
      }

      const phoneUrl = `tel:${orderData.customerPhone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
        console.log('Phone call initiated successfully');
      } else {
        Alert.alert(
          'Call Not Supported',
          'Your device does not support making phone calls.',
          [
            { text: 'OK' },
            { 
              text: 'Show Number', 
              onPress: () => Alert.alert('Customer Phone', orderData.customerPhone)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Phone call failed:', error);
      Alert.alert(
        'Call Failed',
        'Unable to initiate phone call. Please try again.',
        [
          { text: 'Cancel' },
          { text: 'Retry', onPress: handleCallCustomer },
          { 
            text: 'Show Number', 
            onPress: () => Alert.alert('Customer Phone', orderData.customerPhone)
          }
        ]
      );
    }
  };

  const [tripState, setTripState] = useState<TripState>({
    status: 'idle',
    startTime: null,
    restStartTime: null,
    totalRestTime: 0,
  });

  const [distance, setDistance] = useState(INITIAL_DISTANCE);
  const [fare, setFare] = useState(BASE_FARE + (INITIAL_DISTANCE * FARE_RATE));
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState('--:--');
  const [showDropoffDialog, setShowDropoffDialog] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [demandValue, setDemandValue] = useState(0);
  const [totalFare, setTotalFare] = useState(BASE_FARE);
  const [activeTab, setActiveTab] = useState('pricing');
  const [cumulativeTotal, setCumulativeTotal] = useState(0);
  const [recentAdditions, setRecentAdditions] = useState<number[]>([]);

  // Animation values
  const distanceAnim = useRef(new Animated.Value(INITIAL_DISTANCE)).current;
  const fareAnim = useRef(new Animated.Value(INITIAL_DISTANCE * FARE_RATE)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonsOpacityAnim = useRef(new Animated.Value(0)).current;
  const priceAddAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Timers
  const tripTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Calculate total fare including demand
    const distanceFare = distance * FARE_RATE;
    const calculatedTotal = BASE_FARE + distanceFare + demandValue + cumulativeTotal;
    setTotalFare(calculatedTotal);
    setFare(calculatedTotal);
  }, [distance, demandValue, cumulativeTotal]);

  useEffect(() => {
    // Initialize immediately without loading delays
    setShowCancelButton(!!hasCompleteOrderData);
    
    // Animate buttons in smoothly
    setTimeout(() => {
      Animated.timing(buttonsOpacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 100);
    
    return () => {
      if (tripTimer.current) clearInterval(tripTimer.current);
    };
  }, []);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={14}
        color={index < Math.floor(rating) ? '#F59E0B' : '#E5E7EB'}
        fill={index < Math.floor(rating) ? '#F59E0B' : '#E5E7EB'}
      />
    ));
  };

  const animateCounters = (newDistance: number, newFare: number) => {
    Animated.parallel([
      Animated.timing(distanceAnim, {
        toValue: newDistance,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(fareAnim, {
        toValue: newFare,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleDemandSelect = (selectedDemand: number) => {
    setDemandValue(selectedDemand);
    setShowDemandModal(false);
  };

  const handlePriceAdd = (value: number) => {
    // Add to cumulative total
    setCumulativeTotal(prev => prev + value);
    
    // Track recent additions for undo functionality
    setRecentAdditions(prev => [...prev.slice(-4), value]);
    
    // Animate the addition
    Animated.sequence([
      Animated.timing(priceAddAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(priceAddAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClearCumulative = () => {
    Alert.alert(
      'Clear Total',
      `Are you sure you want to clear the cumulative total of ${cumulativeTotal.toLocaleString()} MMK?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setCumulativeTotal(0);
            setRecentAdditions([]);
          },
        },
      ]
    );
  };

  const handleUndoLast = () => {
    if (recentAdditions.length > 0) {
      const lastAddition = recentAdditions[recentAdditions.length - 1];
      setCumulativeTotal(prev => Math.max(0, prev - lastAddition));
      setRecentAdditions(prev => prev.slice(0, -1));
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Animate tab indicator
    const tabIndex = NAVIGATION_TABS.findIndex(tab => tab.id === tabId);
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  const startTrip = () => {
    setTripState({
      status: 'active',
      startTime: Date.now(),
      restStartTime: null,
      totalRestTime: 0,
    });

    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Start trip simulation
    startTripSimulation();
  };

  const startTripSimulation = () => {
    let currentDistance = INITIAL_DISTANCE;
    
    tripTimer.current = setInterval(() => {
      if (tripState.status === 'active') {
        // Simulate distance increment (0.05-0.15 km per update)
        const increment = Math.random() * 0.1 + 0.05;
        currentDistance += increment;
        const newFare = BASE_FARE + (currentDistance * FARE_RATE) + demandValue;

        setDistance(currentDistance);
        setFare(newFare);
        animateCounters(currentDistance, newFare);

        // Simulate speed and ETA
        setSpeed(Math.random() * 20 + 30); // 30-50 km/h
        const estimatedMinutes = Math.random() * 30 + 10;
        const etaTime = new Date(Date.now() + estimatedMinutes * 60000);
        setEta(etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }, 3000); // Update every 3 seconds
  };

  const toggleRest = () => {
    if (tripState.status === 'active') {
      setTripState(prev => ({
        ...prev,
        status: 'resting',
        restStartTime: Date.now(),
      }));
    } else if (tripState.status === 'resting') {
      const restDuration = Date.now() - (tripState.restStartTime || 0);
      setTripState(prev => ({
        ...prev,
        status: 'active',
        restStartTime: null,
        totalRestTime: prev.totalRestTime + restDuration,
      }));
    }
  };

  const dropOff = () => {
    setShowDropoffDialog(true);
  };

  const handleDropoffConfirm = () => {
    if (tripTimer.current) clearInterval(tripTimer.current);
    setTripState({
      status: 'completed',
      startTime: null,
      restStartTime: null,
      totalRestTime: 0,
    });
  };

  const resetTrip = () => {
    if (tripTimer.current) clearInterval(tripTimer.current);
    setTripState({
      status: 'idle',
      startTime: null,
      restStartTime: null,
      totalRestTime: 0,
    });
    setDistance(INITIAL_DISTANCE);
    const resetFare = BASE_FARE + (INITIAL_DISTANCE * FARE_RATE) + demandValue;
    setFare(resetFare);
    distanceAnim.setValue(INITIAL_DISTANCE);
    fareAnim.setValue(resetFare);
    setEta('--:--');
    setDemandValue(0);
  };

  const renderNavigationTabs = () => (
    <View style={styles.navigationTabs}>
      <View style={styles.tabsContainer}>
        {NAVIGATION_TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                isActive && styles.activeTabButton,
              ]}
              onPress={() => handleTabChange(tab.id)}
            >
              <IconComponent 
                size={20} 
                color={isActive ? '#3B82F6' : '#6B7280'} 
              />
              <Text style={[
                styles.tabLabel,
                isActive && styles.activeTabLabel,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Animated Tab Indicator */}
      <Animated.View
        style={[
          styles.tabIndicator,
          {
            transform: [{
              translateX: tabIndicatorAnim.interpolate({
                inputRange: [0, NAVIGATION_TABS.length - 1],
                outputRange: [0, (width - 40) / NAVIGATION_TABS.length * (NAVIGATION_TABS.length - 1)],
              })
            }]
          }
        ]}
      />
    </View>
  );

  const renderPriceOptions = () => (
    <View style={styles.priceOptionsContainer}>
      <Text style={styles.sectionTitle}>Add to Total</Text>
      <View style={styles.priceGrid}>
        {PRICE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.priceOption,
              { borderColor: option.color }
            ]}
            onPress={() => handlePriceAdd(option.value)}
          >
            <View style={[styles.priceIndicator, { backgroundColor: option.color }]}>
              <Plus size={16} color="white" />
            </View>
            <Text style={styles.priceValue}>{option.value.toLocaleString()}</Text>
            <Text style={styles.priceLabel}>MMK</Text>
            <Text style={styles.priceDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCumulativeDisplay = () => (
    <Animated.View style={[
      styles.cumulativeDisplay,
      {
        transform: [{
          scale: priceAddAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.05],
          })
        }]
      }
    ]}>
      <View style={styles.cumulativeHeader}>
        <Text style={styles.cumulativeLabel}>Cumulative Total</Text>
        <View style={styles.cumulativeActions}>
          {recentAdditions.length > 0 && (
            <TouchableOpacity
              style={styles.undoButton}
              onPress={handleUndoLast}
            >
              <RotateCcw size={16} color="#6B7280" />
              <Text style={styles.undoText}>Undo</Text>
            </TouchableOpacity>
          )}
          {cumulativeTotal > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearCumulative}
            >
              <X size={16} color="#EF4444" />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text style={styles.cumulativeAmount}>
        +{cumulativeTotal.toLocaleString()} MMK
      </Text>
      
      {recentAdditions.length > 0 && (
        <View style={styles.recentAdditions}>
          <Text style={styles.recentLabel}>Recent: </Text>
          {recentAdditions.slice(-3).map((addition, index) => (
            <Text key={index} style={styles.recentItem}>
              +{addition.toLocaleString()}
            </Text>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pricing':
        return (
          <View style={styles.tabContent}>
            {renderPriceOptions()}
            {renderCumulativeDisplay()}
          </View>
        );
      
      case 'demand':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Demand Pricing</Text>
            <TouchableOpacity 
              style={styles.demandButton}
              onPress={() => setShowDemandModal(true)}
            >
              <TrendingUp size={20} color="white" />
              <Text style={styles.demandButtonText}>
                {demandValue > 0 ? `+${demandValue} MMK` : 'Set Demand'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'settings':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Trip Settings</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Base Fare</Text>
              <Text style={styles.settingValue}>{BASE_FARE.toLocaleString()} MMK</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Rate per KM</Text>
              <Text style={styles.settingValue}>{FARE_RATE.toLocaleString()} MMK</Text>
            </View>
          </View>
        );
      
      case 'calculator':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Fare Calculator</Text>
            <View style={styles.calculatorDisplay}>
              <View style={styles.calculatorRow}>
                <Text style={styles.calculatorLabel}>Base Fare:</Text>
                <Text style={styles.calculatorValue}>{BASE_FARE.toLocaleString()} MMK</Text>
              </View>
              <View style={styles.calculatorRow}>
                <Text style={styles.calculatorLabel}>Distance ({distance.toFixed(1)} km):</Text>
                <Text style={styles.calculatorValue}>{(distance * FARE_RATE).toLocaleString()} MMK</Text>
              </View>
              <View style={styles.calculatorRow}>
                <Text style={styles.calculatorLabel}>Demand:</Text>
                <Text style={styles.calculatorValue}>{demandValue.toLocaleString()} MMK</Text>
              </View>
              <View style={styles.calculatorRow}>
                <Text style={styles.calculatorLabel}>Cumulative:</Text>
                <Text style={styles.calculatorValue}>{cumulativeTotal.toLocaleString()} MMK</Text>
              </View>
              <View style={[styles.calculatorRow, styles.calculatorTotal]}>
                <Text style={styles.calculatorTotalLabel}>Total:</Text>
                <Text style={styles.calculatorTotalValue}>{totalFare.toLocaleString()} MMK</Text>
              </View>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };
  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? All order data will be cleared.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            // Clear all timers
            if (tripTimer.current) clearInterval(tripTimer.current);
            
            // Reset trip state
            setTripState({
              status: 'idle',
              startTime: null,
              restStartTime: null,
              totalRestTime: 0,
            });
            
            // Reset counters
            setDistance(INITIAL_DISTANCE);
            const resetFare = BASE_FARE + (INITIAL_DISTANCE * FARE_RATE);
            setFare(resetFare);
            distanceAnim.setValue(INITIAL_DISTANCE);
            fareAnim.setValue(resetFare);
            setEta('--:--');
            setDemandValue(0);
            
            // Hide cancel button
            setShowCancelButton(false);
            
            // Navigate back to orders tab to clear order data
            router.replace('/(tabs)/');
          },
        },
      ]
    );
  };
  const tripDetails = {
    distance,
    duration: tripState.startTime 
      ? `${Math.round((Date.now() - tripState.startTime) / 60000)} minutes`
      : '0 minutes',
    speed,
    totalCost: Math.round(fare),
    startTime: tripState.startTime 
      ? new Date(tripState.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--:--',
    endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pickupLocation: hasCompleteOrderData ? orderData.pickupLocation : 'Current Location',
    dropoffLocation: hasCompleteOrderData ? orderData.destination : 'Destination',
    customerName: hasCompleteOrderData ? orderData.customerName : undefined,
    customerPhone: hasCompleteOrderData ? orderData.customerPhone : undefined,
    orderId: hasCompleteOrderData ? orderData.orderId : undefined,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Enhanced Customer Info Header - Only show if we have complete order data */}
        {hasCompleteOrderData ? (
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (tripState.status === 'active' || tripState.status === 'resting') {
                  Alert.alert(
                    'Trip in Progress',
                    'You have an active trip. Are you sure you want to go back?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Yes', onPress: () => router.back() },
                    ]
                  );
                } else {
                  router.back();
                }
              }}
            >
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
            
            <View style={styles.customerHeader}>
              <View style={styles.customerInfo}>
                <View style={styles.customerNameRow}>
                  <Text style={styles.customerName}>{orderData.customerName}</Text>
                  <View style={styles.ratingContainer}>
                    <View style={styles.stars}>
                      {renderStars(orderData.customerRating)}
                    </View>
                    <Text style={styles.ratingText}>{orderData.customerRating}</Text>
                  </View>
                </View>
                <Text style={styles.customerPhone}>{orderData.customerPhone}</Text>
                <Text style={styles.orderInfo}>Order #{orderData.orderId}</Text>
              </View>
              <TouchableOpacity 
                style={styles.callButton}
                onPress={handleCallCustomer}
              >
                <Phone size={20} color="white" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
            
            <View style={styles.customerHeader}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>Navigation</Text>
                <Text style={styles.customerPhone}>No active order</Text>
              </View>
            </View>
          </View>
        )}

        {/* Order Summary Card - Only show if we have complete order data */}
        {hasCompleteOrderData && (
          <View style={styles.orderSummaryCard}>
            <View style={styles.routeInfo}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.routeText} numberOfLines={1}>{orderData.pickupLocation}</Text>
              </View>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.routeText} numberOfLines={1}>{orderData.destination}</Text>
              </View>
            </View>
            <View style={styles.orderMetrics}>
              <Text style={styles.metricText}>{orderData.distance}</Text>
              <Text style={styles.metricText}>{orderData.estimatedDuration}</Text>
              <Text style={[styles.metricText, styles.fareText]}>{orderData.fareAmount.toLocaleString()} MMK</Text>
            </View>
          </View>
        )}

        {/* No Order State - Show when no order data is available */}
        {!hasCompleteOrderData && (
          <View style={styles.noOrderCard}>
            <View style={styles.noOrderIcon}>
              <NavigationIcon size={48} color="#6B7280" />
            </View>
            <Text style={styles.noOrderTitle}>No Active Order</Text>
            <Text style={styles.noOrderText}>
              Accept an order from the Orders tab to start navigation
            </Text>
            <TouchableOpacity 
              style={styles.goToOrdersButton}
              onPress={() => router.push('/(tabs)/')}
            >
              <Text style={styles.goToOrdersButtonText}>Go to Orders</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Map Placeholder for Web */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <MapPin size={48} color="#6B7280" />
            <Text style={styles.placeholderTitle}>Navigation Map</Text>
            <Text style={styles.placeholderText}>
              Interactive maps are not available on web platform.
              {'\n'}Use the mobile app for full navigation features.
            </Text>
          </View>

          {/* Trip Status Overlay */}
          <View style={styles.statusOverlay}>
            <View style={[
              styles.statusBadge,
              tripState.status === 'active' && styles.activeBadge,
              tripState.status === 'resting' && styles.restingBadge,
              tripState.status === 'completed' && styles.completedBadge,
            ]}>
              <Text style={styles.statusText}>
                {tripState.status === 'idle' && 'Ready to Start'}
                {tripState.status === 'active' && 'Trip Active'}
                {tripState.status === 'resting' && 'Resting'}
                {tripState.status === 'completed' && 'Completed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Information Panel */}
        <Animated.View style={[
          styles.infoPanel, 
          { 
            paddingBottom: Math.max(20, insets.bottom + 10),
            opacity: buttonsOpacityAnim 
          }
        ]}>
          {/* Navigation Tabs */}
          {renderNavigationTabs()}
          
          {/* Tab Content */}
          {renderTabContent()}

          <View style={styles.countersContainer}>
            <View style={styles.counterItem}>
              <NavigationIcon size={20} color="#6B7280" />
              <Animated.Text style={styles.counterValue}>
                {distance.toFixed(1)}
              </Animated.Text>
              <Text style={styles.counterLabel}>km</Text>
            </View>

            <View style={styles.counterItem}>
              <DollarSign size={20} color="#10B981" />
              <Animated.Text style={styles.counterValue}>
                {fare.toFixed(0)}
              </Animated.Text>
              <Text style={styles.counterLabel}>MMK</Text>
            </View>

          


            <View style={styles.counterItem}>
              <Zap size={20} color="#8B5CF6" />
              <Text style={styles.counterValue}>{Math.round(speed)}</Text>
              <Text style={styles.counterLabel}>km/h</Text>
            </View>

            <View style={styles.counterItem}>
              <Text style={styles.counterValue}>
                {cumulativeTotal > 0 ? `+${cumulativeTotal}` : '0'}
              </Text>
              <Text style={styles.counterLabel}>Extra</Text>
            </View>
          </View>

          {/* Control Buttons */}
          <View style={styles.controlsContainer}>
            {tripState.status === 'idle' && (
              <View style={styles.idleControls}>
                <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                  <TouchableOpacity style={styles.startButton} onPress={startTrip}>
                    <Play size={24} color="white" />
                    <Text style={styles.startButtonText}>Start Trip</Text>
                  </TouchableOpacity>
                </Animated.View>
                
                {/* Cancel Button - Only show when order data is present */}
                {showCancelButton && (
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
                    <X size={20} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(tripState.status === 'active' || tripState.status === 'resting') && (
              <View style={styles.activeControls}>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.restButton,
                    tripState.status === 'resting' && styles.continueButton,
                  ]}
                  onPress={toggleRest}
                >
                  {tripState.status === 'resting' ? (
                    <>
                      <Play size={20} color="white" />
                      <Text style={styles.controlButtonText}>Continue</Text>
                    </>
                  ) : (
                    <>
                      <Pause size={20} color="white" />
                      <Text style={styles.controlButtonText}>Rest</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.dropOffButton]}
                  onPress={dropOff}
                >
                  <Square size={20} color="white" />
                  <Text style={styles.controlButtonText}>Drop Off</Text>
                </TouchableOpacity>
              </View>
            )}

            {tripState.status === 'completed' && (
              <View style={styles.completedControls}>
                <TouchableOpacity style={styles.resetButton} onPress={resetTrip}>
                  <NavigationIcon size={20} color="white" />
                  <Text style={styles.resetButtonText}>New Trip</Text>
                </TouchableOpacity>
                
                {/* Cancel Button - Show after trip completion if order data exists */}
                {showCancelButton && (
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
                    <X size={20} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Custom Drop-off Dialog */}
      <DropoffDialog
        visible={showDropoffDialog}
        onClose={() => setShowDropoffDialog(false)}
        onConfirm={handleDropoffConfirm}
        tripDetails={tripDetails}
      />

      {/* Demand Modal */}
      <DemandModal
        visible={showDemandModal}
        onClose={() => setShowDemandModal(false)}
        onAdd={handleDemandSelect}
        onClear={handleClearDemand}
        currentDemand={demandValue}
        baseFare={BASE_FARE}
        currentDistance={distance}
        fareRate={FARE_RATE}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 70,
    paddingVertical: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  orderInfo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  orderSummaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeInfo: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  routeText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  orderMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metricText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  fareText: {
    color: '#10B981',
    fontWeight: '600',
  },
  noOrderCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noOrderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noOrderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  noOrderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  goToOrdersButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goToOrdersButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    height: height * 0.45,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  statusOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  activeBadge: {
    backgroundColor: '#10B981',
  },
  restingBadge: {
    backgroundColor: '#F59E0B',
  },
  completedBadge: {
    backgroundColor: '#3B82F6',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  countersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  counterItem: {
    alignItems: 'center',
    flex: 1,
  },
  counterValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginVertical: 4,
  },
  counterLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  controlsContainer: {
    paddingBottom: 20,
  },
  idleControls: {
    gap: 12,
  },
  completedControls: {
    gap: 12,
  },
  startButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  activeControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  restButton: {
    backgroundColor: '#F59E0B',
  },
  continueButton: {
    backgroundColor: '#10B981',
  },
  dropOffButton: {
    backgroundColor: '#EF4444',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  resetButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationTabs: {
    marginBottom: 20,
    position: 'relative',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    width: `${100 / NAVIGATION_TABS.length}%`,
  },
  tabContent: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  priceOptionsContainer: {
    marginBottom: 20,
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    shadowColor: '#000',
    flex: 1,
    shadowOpacity: 0.1,
    backgroundColor: 'white',
    elevation: 2,
    borderRadius: 12,
  priceIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceDescription: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  cumulativeDisplay: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cumulativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cumulativeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  cumulativeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  undoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  clearText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  cumulativeAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
  recentAdditions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recentLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  recentItem: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  demandButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  demandButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  calculatorDisplay: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  calculatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  calculatorLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  calculatorValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  calculatorTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 12,
  },
  calculatorTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  calculatorTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
});
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});