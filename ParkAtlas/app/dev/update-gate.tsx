import React from 'react';
import { UpdateRequiredScreen } from '@/components/UpdateGate';

/** Dev-only preview of the forced-update screen (the real gate is disabled in __DEV__). */
export default function UpdateGatePreview() {
  if (!__DEV__) return null;
  return <UpdateRequiredScreen config={{ minBuild: 99 }} />;
}
