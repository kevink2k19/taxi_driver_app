import React, { useEffect, useRef } from 'react';
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