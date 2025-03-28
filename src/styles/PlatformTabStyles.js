// src/styles/PlatformTabStyles.js
import { StyleSheet } from 'react-native';
import Colors from '../constants/colors';

const PlatformTabStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 16,
  },
  accountButtonText: {
    fontSize: 14,
    color: Colors.white,
    marginRight: 4,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '80%',
    height: '100%',
    backgroundColor: Colors.white,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  list: {
    paddingBottom: 20,
  },
  listHeader: {
    padding: 15,
  },
  loadOrdersContainer: {
    marginTop: 16,
    marginBottom: 16,
    flexDirection: 'column',
  },
  timeFrameSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: '#f8f8f8',
  },
  timeFrameSelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  loadOrdersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loadOrdersButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  // Time frame modal
  timeFrameModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timeFrameModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  timeFrameModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timeFrameModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  timeFrameOptions: {
    padding: 16,
  },
  timeFrameOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#eee',
  },
  timeFrameOptionSelected: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
  },
  timeFrameOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeFrameCustomText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  // Date picker modal
  datePickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  datePickerCancelButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  datePickerCancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  datePickerApplyButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  datePickerApplyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 8, // Optional: adds padding to prevent edge collapse
  },
  loadLatestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1, // Equal flex value for equal width
    marginRight: 4, // Consistent margin with loadAllButton
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    backgroundColor: '#F3F4F6', // Add a background color if missing
  },
  loadAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1, // Equal flex value for equal width
    marginLeft: 4, // Consistent margin with loadLatestButton
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  loadAllButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: Colors.accent,
    flex: 1
  },
  clearButtonText: {
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: 12,
    margin: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    marginLeft: 10,
    flex: 1,
  },
  progressModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  progressModalContent: {
    width: '85%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  progressModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  progressModalSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressModalText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    marginBottom: 20,
  },
  progressModalNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8
  },
  progressModalTimeRemaining: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 10,
  },
  progressModalSmallNote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    opacity: 0.7
  }
});

export default PlatformTabStyles;