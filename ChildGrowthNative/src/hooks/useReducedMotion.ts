import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useExperienceSettings } from '../store/useExperienceSettings';

export default function useReducedMotion() {
  const preference = useExperienceSettings(state => state.reducedMotion);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setSystem(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => { active = false; subscription.remove(); };
  }, []);
  return preference || system;
}
