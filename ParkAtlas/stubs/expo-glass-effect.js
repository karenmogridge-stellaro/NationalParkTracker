/**
 * Stub for expo-glass-effect — replaces the native module with safe no-ops
 * so the app runs in Expo Go (which doesn't ship ExpoGlassEffect).
 */
import React from 'react';
import { View } from 'react-native';

export const GlassView = View;
export const GlassContainer = View;
export function isLiquidGlassAvailable() { return false; }
export function isGlassEffectAPIAvailable() { return false; }
