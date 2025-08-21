import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { X, TrendingUp, DollarSign, Calculator } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface DemandModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (demandValue: number) => void;
  currentDemand: number;
  baseFare: number;
  currentDistance: number;
  fareRate: number;
}

const DEMAND_OPTIONS = [
  { value: 500, label: 'Low Demand', color: '#10B981', description: 'Standard rate' },
  { value: 1000, label: 'Medium Demand', color: '#F59E0B', description: 'Moderate increase' },
  { value: 2000, label: 'High Demand', color: '#EF4444', description: 'Peak hours' },
];

export default function DemandModal({
  visible,
  onClose,
  onSelect,
  currentDemand,
  baseFare,
  currentDistance,
  fareRate,
}: DemandModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const calculateTotal = (demandValue: number) => {
    return baseFare + (currentDistance * fareRate) + demandValue;
  };

  const handleBackdropPress = () => {
    onClose();
  };

  const handleOptionSelect = (demandValue: number) => {
    onSelect(demandValue);
  };

  const renderDemandOption = (option: typeof DEMAND_OPTIONS[0]) => {
    const isSelected = currentDemand === option.value;
    const totalWithDemand = calculateTotal(option.value);

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.demandOption,
          isSelected && styles.demandOptionSelected,
          { borderColor: option.color }
        ]}
        onPress={() => handleOptionSelect(option.value)}
        accessibilityLabel={`Select ${option.label} for ${option.value} MMK`}
        accessibilityRole="button"
      >
        <View style={styles.demandOptionHeader}>
          <View style={[styles.demandIndicator, { backgroundColor: option.color }]}>
            <TrendingUp size={20} color="white" />
          </View>
          <View style={styles.demandOptionInfo}>
            <Text style={[styles.demandOptionLabel, isSelected && styles.demandOptionLabelSelected]}>
              {option.label}
            </Text>
            <Text style={[styles.demandOptionDescription, isSelected && styles.demandOptionDescriptionSelected]}>
              {option.description}
            </Text>
          </View>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Text style={styles.selectedText}>✓</Text>
            </View>
          )}
        </View>

        <View style={styles.demandOptionPricing}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Demand Charge:</Text>
            <Text style={[styles.priceValue, { color: option.color }]}>
              +{option.value.toLocaleString()} MMK
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total Fare:</Text>
            <Text style={styles.totalValue}>
              {totalWithDemand.toLocaleString()} MMK
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View 
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [
                    { scale: scaleAnim },
                    { translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    })},
                  ],
                }
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <TrendingUp size={28} color="#8B5CF6" />
                </View>
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>Select Demand Rate</Text>
                  <Text style={styles.headerSubtitle}>
                    Choose demand pricing for your trip
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                  accessibilityLabel="Close demand modal"
                  accessibilityRole="button"
                >
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              {/* Demand Options */}
              <View style={styles.optionsContainer}>
                <Text style={styles.optionsTitle}>Available Demand Options</Text>
                {DEMAND_OPTIONS.map(renderDemandOption)}
              </View>

              {/* Clear Demand Option */}
              <TouchableOpacity
                style={[
                  styles.clearDemandButton,
                  currentDemand === 0 && styles.clearDemandButtonSelected
                ]}
                onPress={() => handleOptionSelect(0)}
              >
                <DollarSign size={20} color={currentDemand === 0 ? 'white' : '#6B7280'} />
                <Text style={[
                  styles.clearDemandText,
                  currentDemand === 0 && styles.clearDemandTextSelected
                ]}>
                  No Demand Charge (Base Rate Only)
                </Text>
                {currentDemand === 0 && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareBreakdown: {
    margin: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  demandBreakdownValue: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  breakdownTotalValue: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '700',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  demandOption: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  demandOptionSelected: {
    backgroundColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  demandOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  demandIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  demandOptionInfo: {
    flex: 1,
  },
  demandOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  demandOptionLabelSelected: {
    color: '#1F2937',
  },
  demandOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  demandOptionDescriptionSelected: {
    color: '#374151',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  demandOptionPricing: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
  },
  clearDemandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  clearDemandButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  clearDemandText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  clearDemandTextSelected: {
    color: 'white',
  },
});
  Dimensions,
  ScrollView,
} from 'react-native';
import { X, MapPin, Clock, DollarSign, Navigation, Zap, Calendar, CircleCheck as CheckCircle } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface TripDetails {
  distance: number;
  duration: string;
  speed: number;
  totalCost: number;
  startTime: string;
  endTime: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  customerName?: string;
  customerPhone?: string;
  orderId?: string;
}

interface DropoffDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tripDetails: TripDetails;
}

export default function DropoffDialog({ 
  visible, 
  onClose, 
  onConfirm, 
  tripDetails 
}: DropoffDialogProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Prevent background scrolling
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleBackdropPress = () => {
    onClose();
  };

  const handleConfirm = () => {
    // Call the onConfirm callback to update order status
    onConfirm();
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} MMK`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View 
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.dialogContainer,
                {
                  transform: [
                    { scale: scaleAnim },
                    { translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    })},
                  ],
                }
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <CheckCircle size={28} color="#10B981" />
                </View>
                <Text style={styles.headerTitle}>Complete Trip</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                  accessibilityLabel="Close dialog"
                  accessibilityRole="button"
                >
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
              >
                {/* Price Section */}
               <View style={styles.priceSection}>
                  {tripDetails.customerName && (
                    <Text style={styles.customerInfoText}>Customer: {tripDetails.customerName}</Text>
                  )}
                  {tripDetails.orderId && (
                    <Text style={styles.orderIdText}>Order ID: {tripDetails.orderId}</Text>
                  )}
                  <Text style={styles.priceLabel}>Total Fare</Text>
                  <Text style={styles.priceAmount}>
                    {formatCurrency(tripDetails.totalCost)}
                  </Text>
                  <Text style={styles.priceSubtext}>
                    Distance: {tripDetails.distance.toFixed(2)} km
                  </Text>
                  <Text style={styles.modalOrderText}>
                    {Math.round((tripDetails.totalCost - 2000)).toLocaleString()} MMK
                  </Text>
                </View>

                {/* Trip Details */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Trip Summary</Text>
                  
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Navigation size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Distance Traveled</Text>
                      <Text style={styles.detailValue}>{tripDetails.distance.toFixed(2)} km</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Clock size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Trip Duration</Text>
                      <Text style={styles.detailValue}>{tripDetails.duration}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Zap size={20} color="#8B5CF6" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Average Speed</Text>
                      <Text style={styles.detailValue}>{Math.round(tripDetails.speed)} km/h</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Calendar size={20} color="#EF4444" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Trip Time</Text>
                      <Text style={styles.detailValue}>
                        {tripDetails.startTime} - {tripDetails.endTime}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Location Details */}
                {(tripDetails.pickupLocation || tripDetails.dropoffLocation) && (
                  <View style={styles.locationSection}>
                    <Text style={styles.sectionTitle}>Route Details</Text>
                    
                    {tripDetails.pickupLocation && (
                      <View style={styles.locationRow}>
                        <View style={[styles.locationDot, { backgroundColor: '#10B981' }]} />
                        <View style={styles.locationContent}>
                          <Text style={styles.locationLabel}>Pickup</Text>
                          <Text style={styles.locationAddress}>{tripDetails.pickupLocation}</Text>
                        </View>
                      </View>
                    )}

                    {tripDetails.dropoffLocation && (
                      <View style={styles.locationRow}>
                        <View style={[styles.locationDot, { backgroundColor: '#EF4444' }]} />
                        <View style={styles.locationContent}>
                          <Text style={styles.locationLabel}>Drop-off</Text>
                          <Text style={styles.locationAddress}>{tripDetails.dropoffLocation}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Fare Breakdown */}
                <View style={styles.fareBreakdown}>
                  <Text style={styles.sectionTitle}>Fare Breakdown</Text>
                  
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Base Fare</Text>
                    <Text style={styles.fareValue}>1,000 MMK</Text>
                  </View>
                  
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>
                      Distance ({tripDetails.distance.toFixed(2)} km × 600 MMK)
                    </Text>
                    <Text style={styles.fareValue}>
                      {Math.round((tripDetails.totalCost - 1000)).toLocaleString()} MMK
                    </Text>
                  </View>
                  
                  <View style={styles.fareDivider} />
                  
                  <View style={styles.fareRow}>
                    <Text style={styles.fareTotalLabel}>Total Amount</Text>
                    <Text style={styles.fareTotalValue}>
                      {formatCurrency(tripDetails.totalCost)}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={onClose}
                  accessibilityLabel="Cancel trip completion"
                  accessibilityRole="button"
                >
                  <Text style={styles.fareValue}>2,000 MMK</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  accessibilityLabel="Confirm trip completion"
                  accessibilityRole="button"
                >
                  <CheckCircle size={20} color="white" />
                  <Text style={styles.confirmButtonText}>Complete Trip</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    maxHeight: height * 0.6,
  },
  priceSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 8,
  },
  priceSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  detailsSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  locationSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 6,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  fareBreakdown: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fareLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  fareValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  fareDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  fareTotalLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  fareTotalValue: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#10B981',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalOrderText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  customerInfoText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  orderIdText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
    marginBottom: 8,
    textAlign: 'center',
  },
});