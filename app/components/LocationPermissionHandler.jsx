import React from 'react';
import LocationPermissionModal from './settings/LocationPermissionModal';

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