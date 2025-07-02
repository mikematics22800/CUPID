import React from 'react';
import LocationPermissionModal from './auth/LocationPermissionModal';

export default function LocationPermissionHandler({ 
  visible, 
  onClose, 
  onLocationEnabled, 
  onLocationDisabled 
}) {
  return (
    <LocationPermissionModal
      visible={visible}
      onClose={onClose}
      onLocationEnabled={onLocationEnabled}
      onLocationDisabled={onLocationDisabled}
    />
  );
} 