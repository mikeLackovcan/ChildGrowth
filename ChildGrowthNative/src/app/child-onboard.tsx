import React from 'react';
import { Redirect } from 'expo-router';

// Keep old links working, but use the real invitation flow.
export default function ChildOnboardScreen() {
  return <Redirect href="/link-account" />;
}
