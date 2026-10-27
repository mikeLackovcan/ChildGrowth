import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View,
  type ImageSourcePropType, type LayoutChangeEvent,
} from 'react-native';
import { Zap, Sparkles, ArrowUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useWorldStore } from '../../store/useWorldStore';
import AnimatedQuestHero, { type HeroMotion } from '../../components/AnimatedQuestHero';
import { playSound } from '../../lib/sound';
import useReducedMotion from '../../hooks/useReducedMotion';
import { worldDropTarget } from '../../lib/worldPlacement';
import {
  STARTER_BUILD_POWER, todayBuildPower, worldPowerBalance, WORLD_BUILDINGS,
  type WorldBuildingType, type WorldPlacement,
} from '../../lib/worldEconomy';

const MAP_WIDTH = 400;
const MAP_HEIGHT = 560;
import { WORLD_PLOTS as PLOTS } from '../../lib/worldEconomy';

const TOWN_BOARD = require('../../../assets/world/quest-champ-town-board-v2.jpg');

const ORIGINAL_BUILDINGS = {
  home: require('../../../assets/world/original-buildings/home.png'),
  park: require('../../../assets/world/original-buildings/park.png'),
  bakery: require('../../../assets/world/original-buildings/bakery.png'),
  school: require('../../../assets/world/original-buildings/school.png'),
  library: require('../../../assets/world/original-buildings/library.png'),
  clubhouse: require('../../../assets/world/original-buildings/clubhouse.png'),
  cafe: require('../../../assets/world/original-buildings/cafe.png'),
  studio: require('../../../assets/world/original-buildings/studio.png'),
} satisfies Partial<Record<WorldBuildingType, ImageSourcePropType>>;

const KAYKIT = {
  bench: require('../../../assets/world/kaykit/bench.png'),
  bush: require('../../../assets/world/kaykit/bush.png'),
  light: require('../../../assets/world/kaykit/streetlight.png'),
} as const;

type MainBuilding = Exclude<WorldBuildingType, 'park' | 'tree' | 'bench' | 'streetlight'>;

function TownBase() {
  return <Image source={TOWN_BOARD} resizeMode="stretch" fadeDuration={0} style={styles.townBoard} />;
}

function SpriteImage({ source, style }: { source: ImageSourcePropType; style?: object }) {
  return <Image source={source} resizeMode="contain" fadeDuration={0} style={style} />;
}

function WorldItemSprite({ placement, x, y }: { placement: WorldPlacement; x: number; y: number }) {
  const { type, level } = placement;
  if (type === 'tree' || type === 'bench' || type === 'streetlight') {
    const source = type === 'tree' ? KAYKIT.bush : type === 'bench' ? KAYKIT.bench : KAYKIT.light;
    const decorPosition = { left: `${((x - 36) / MAP_WIDTH) * 100}%`, top: `${((y - 46) / MAP_HEIGHT) * 100}%` } as const;
    return <View pointerEvents="none" style={[styles.decorContainer, decorPosition]}><SpriteImage source={source} style={styles.decorSprite} /></View>;
  }
  const isTopLandmark = y < 100;
  const halfWidth = isTopLandmark ? 50 : 62;
  const rise = isTopLandmark ? 72 : type === 'park' ? 86 : 92;
  const position = { left: `${((x - halfWidth) / MAP_WIDTH) * 100}%`, top: `${((y - rise) / MAP_HEIGHT) * 100}%` } as const;
  return <View pointerEvents="none" style={[styles.worldSprite, isTopLandmark && styles.worldSpriteTop, position]}>
    <SpriteImage source={ORIGINAL_BUILDINGS[type as MainBuilding | 'park']} style={[styles.buildingSprite, level === 2 && styles.buildingLevelTwo, level >= 3 && styles.buildingLevelThree]} />
    {level > 1 && <View style={styles.levelSparkles}><Sparkles size={level >= 3 ? 18 : 15} color="#FFF7AD" fill="#FFE56C" /></View>}
    <View style={[styles.levelFlag, { backgroundColor: WORLD_BUILDINGS[type].color }]}><Text style={styles.levelFlagText}>{level}</Text></View>
  </View>;
}

function EmptyPlot({ x, y, active = false }: { x: number; y: number; active?: boolean }) {
  return <View pointerEvents="none" style={[styles.emptyPlot, { left: `${((x - 35) / MAP_WIDTH) * 100}%`, top: `${((y - 22) / MAP_HEIGHT) * 100}%` }]}>
    <View style={[styles.plotDiamond, active ? styles.plotDiamondActive : styles.plotDiamondIdle]} />
    {active ? <Text style={styles.plotPlus}>＋</Text> : null}
  </View>;
}

function ItemThumbnail({ type }: { type: WorldBuildingType }) {
  let source: ImageSourcePropType;
  if (type === 'park') source = ORIGINAL_BUILDINGS.park;
  else if (type === 'tree') source = KAYKIT.bush;
  else if (type === 'bench') source = KAYKIT.bench;
  else if (type === 'streetlight') source = KAYKIT.light;
  else source = ORIGINAL_BUILDINGS[type];
  return <SpriteImage source={source} style={styles.thumbnail} />;
}

function DraggableBuildItem({ type, available, selected, label, onSelect, onDrop }: {
  type: WorldBuildingType; available: boolean; selected: boolean; label: string;
  onSelect: () => void; onDrop: (type: WorldBuildingType, pageX: number, pageY: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const translation = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);
  const item = WORLD_BUILDINGS[type];
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => available && gesture.dy < -8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => { setDragging(true); translation.stopAnimation(); translation.setValue({ x: 0, y: 0 }); void Haptics.selectionAsync(); },
    onPanResponderMove: Animated.event([null, { dx: translation.x, dy: translation.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => { translation.flattenOffset(); setDragging(false); onDrop(type, gesture.moveX, gesture.moveY); Animated.spring(translation, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start(); },
    onPanResponderTerminate: () => { translation.flattenOffset(); setDragging(false); Animated.spring(translation, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start(); },
  }), [available, onDrop, translation, type]);
  return <Animated.View {...panResponder.panHandlers} style={[styles.buildItem, selected && styles.buildItemSelected, !available && styles.buildItemDisabled, dragging && styles.buildItemDragging, { transform: translation.getTranslateTransform() }]}>
    <Pressable disabled={!available} accessibilityRole="button" accessibilityState={{ selected, disabled: !available }} accessibilityLabel={t('world_build_item_label', { item: label, amount: item.cost.toLocaleString(i18n.language) })} onPress={onSelect} style={styles.buildItemPressable}>
      <ItemThumbnail type={type} /><Text style={styles.buildName}>{label}</Text>
      <Text style={styles.buildCost}>{item.cost.toLocaleString(i18n.language)} ⚡</Text>
    </Pressable>
  </Animated.View>;
}

export default function MyWorldScreen() {
  const { t, i18n } = useTranslation();
  const reducedMotion = useReducedMotion();
  const formatNumber = (value: number) => value.toLocaleString(i18n.language);
  const insets = useSafeAreaInsets();
  const app = useAppStore();
  const world = useWorldStore();
  const ownerKey = app.userId || app.nickname || 'guest-local';
  const availablePower = worldPowerBalance(app.totalEarned, world.spentPower);
  const earnedToday = todayBuildPower(app.tasks);
  const [selectedType, setSelectedType] = useState<WorldBuildingType | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
  const [message, setMessage] = useState(() => t('world_drag_hint'));
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [heroMotion, setHeroMotion] = useState<HeroMotion>('idle');
  const canvasRef = useRef<View>(null);
  const heroPosition = useRef(new Animated.ValueXY({ x: 165, y: 310 })).current;
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { void world.hydrate(ownerKey); }, [ownerKey]);
  useEffect(() => { setMessage(t('world_drag_hint')); }, [app.language, t]);
  const itemName = (type: WorldBuildingType) => t(WORLD_BUILDINGS[type].nameKey);
  const ready = world.hydrated && world.ownerKey === ownerKey;
  useEffect(() => {
    setSelectedType(null); setSelectedPlot(null); setHeroMotion('idle'); heroPosition.stopAnimation();
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
  }, [ownerKey, heroPosition]);
  useEffect(() => () => {
    heroPosition.stopAnimation();
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
  }, [heroPosition]);

  const celebrateHero = () => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    setHeroMotion('celebrate');
    celebrationTimer.current = setTimeout(() => setHeroMotion('idle'), 1450);
  };

  const runHeroTo = (plotId: string) => {
    const plot = PLOTS.find(item => item.id === plotId) || PLOTS[0];
    const x = (plot.x / MAP_WIDTH) * canvasSize.width - 35;
    const y = (plot.y / MAP_HEIGHT) * canvasSize.height - 61;
    heroPosition.stopAnimation();
    if (reducedMotion) { heroPosition.setValue({ x, y }); celebrateHero(); return; }
    Animated.sequence([
      Animated.timing(heroPosition, { toValue: { x, y }, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(heroPosition, { toValue: { x, y: y - 12 }, friction: 3, useNativeDriver: true }),
      Animated.spring(heroPosition, { toValue: { x, y }, friction: 4, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) celebrateHero(); });
  };
  const place = (plotId: string, type: WorldBuildingType) => {
    if (!ready) return;
    if (!world.placeBuilding(plotId, type, availablePower)) {
      setMessage(availablePower < WORLD_BUILDINGS[type].cost ? t('world_need_power') : t('world_choose_empty'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return;
    }
    runHeroTo(plotId); setSelectedType(null); setSelectedPlot(plotId);
    setMessage(t('world_built', { item: itemName(type) })); playSound('unlock');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const drop = (type: WorldBuildingType, pageX: number, pageY: number) => canvasRef.current?.measureInWindow((left, top, width, height) => {
    if (!width || !height || !ready || useWorldStore.getState().ownerKey !== ownerKey) return;
    const x = ((pageX - left) / width) * MAP_WIDTH; const y = ((pageY - top) / height) * MAP_HEIGHT;
    const target = worldDropTarget(x, y, useWorldStore.getState().placements);
    if (!target) { setMessage(t('world_drop_hint')); return; }
    place(target, type);
  });
  const pressPlot = (plotId: string) => {
    const existing = world.placements.find(item => item.plotId === plotId);
    if (!existing && selectedType) { place(plotId, selectedType); return; }
    setSelectedPlot(plotId);
    setMessage(existing ? t('world_item_level', { item: itemName(existing.type), level: existing.level }) : t('world_choose_below'));
  };
  const upgrade = () => {
    if (!selectedPlot || !ready) return;
    const building = world.placements.find(item => item.plotId === selectedPlot); if (!building) return;
    if (!world.upgradeBuilding(selectedPlot, availablePower)) { setMessage(building.level >= WORLD_BUILDINGS[building.type].maxLevel ? t('world_max_level') : t('world_need_power')); return; }
    runHeroTo(selectedPlot); setMessage(t('world_upgraded', { item: itemName(building.type) })); playSound('unlock'); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const onCanvasLayout = (event: LayoutChangeEvent) => { const { width, height } = event.nativeEvent.layout; setCanvasSize({ width, height }); heroPosition.setValue({ x: width * 0.42, y: height * 0.57 }); };
  const currentBuilding = selectedPlot ? world.placements.find(item => item.plotId === selectedPlot) : null;
  const currentMeta = currentBuilding ? WORLD_BUILDINGS[currentBuilding.type] : null;
  const nextUpgrade = currentBuilding && currentMeta ? currentMeta.upgradeCost * currentBuilding.level : 0;
  const firstName = (app.fullName || app.nickname || '').split(' ')[0];
  const heroWidth = Math.min(102, Math.max(72, canvasSize.width * 0.18));
  const heroHeight = heroWidth * 1.4;

  return <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View>{firstName ? <Text style={styles.eyebrow}>{t('world_owners', { name: firstName })}</Text> : null}<Text style={styles.title}>{t('tab_world')}</Text></View>
      <View style={styles.powerValue} accessibilityLabel={t('world_power_available', { count: availablePower })}><Zap size={21} color="#7C5600" fill="#F6B83F" /><Text style={styles.powerText}>{formatNumber(availablePower)}</Text></View>
    </View>
    <View style={styles.dailyRow}><Text style={styles.dailyLabel}>{t('world_today')}</Text><View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityLabel={t('world_today')} accessibilityValue={{ min: 0, max: 10000, now: earnedToday }}><View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, earnedToday / 100))}%` }]} /></View><Text style={styles.dailyAmount}>+{formatNumber(earnedToday)} ⚡</Text></View>
    <View ref={canvasRef} collapsable={false} style={styles.canvas} onLayout={onCanvasLayout}>
      <TownBase />
      {PLOTS.map(plot => { const placement = world.placements.find(item => item.plotId === plot.id); return placement ? <WorldItemSprite key={plot.id} placement={placement} x={plot.x} y={plot.y} /> : <EmptyPlot key={plot.id} x={plot.x} y={plot.y} active={Boolean(selectedType) || selectedPlot === plot.id} />; })}
      {PLOTS.map((plot, index) => { const placement = world.placements.find(item => item.plotId === plot.id); return <Pressable key={`touch-${plot.id}`} disabled={!ready} accessibilityRole="button" accessibilityState={{ selected: selectedPlot === plot.id, disabled: !ready }} accessibilityLabel={placement ? t('world_item_level', { item: itemName(placement.type), level: placement.level }) : t('world_plot_number', { number: index + 1 })} onPress={() => pressPlot(plot.id)} style={[styles.plotTouch, selectedPlot === plot.id && styles.plotTouchSelected, { left: `${((plot.x - 38) / MAP_WIDTH) * 100}%`, top: `${((plot.y - 42) / MAP_HEIGHT) * 100}%` }]} />; })}
      <Animated.View pointerEvents="none" style={[styles.worldHero, { width: heroWidth, height: heroHeight, transform: heroPosition.getTranslateTransform() }]}><AnimatedQuestHero id={app.currentAvatar} motion={heroMotion} style={{ width: heroWidth, height: heroHeight }} /></Animated.View>
    </View>
    <View style={styles.instructionRow}><Sparkles size={18} color="#3270EB" /><Text accessibilityLiveRegion="polite" style={styles.instruction}>{message}</Text></View>
    {currentBuilding && currentMeta && currentMeta.maxLevel > 1 && <Pressable accessibilityRole="button" disabled={currentBuilding.level >= currentMeta.maxLevel} onPress={upgrade} style={[styles.upgradeRow, currentBuilding.level >= currentMeta.maxLevel && styles.upgradeDisabled]}>
      <ItemThumbnail type={currentBuilding.type} /><View style={{ flex: 1 }}><Text style={styles.upgradeTitle}>{t('world_item_level', { item: itemName(currentBuilding.type), level: currentBuilding.level })}</Text><Text style={styles.upgradeMeta}>{currentBuilding.level >= currentMeta.maxLevel ? t('world_max_level') : t('world_power_cost', { count: formatNumber(nextUpgrade) })}</Text></View>{currentBuilding.level < currentMeta.maxLevel && <ArrowUp size={22} color="#FFFFFF" />}
    </Pressable>}
    <Text style={styles.sectionTitle}>{t('world_build_decorate')}</Text><Text style={styles.sectionHint}>{t('world_tap_or_drag')}</Text>
    <ScrollView horizontal style={styles.trayScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buildTray}>{(Object.keys(WORLD_BUILDINGS) as WorldBuildingType[]).map(type => <DraggableBuildItem key={type} type={type} label={itemName(type)} available={ready && availablePower >= WORLD_BUILDINGS[type].cost} selected={selectedType === type} onSelect={() => { setSelectedType(type); setMessage(t('world_selected_hint', { item: itemName(type) })); }} onDrop={drop} />)}</ScrollView>
    {world.spentPower === 0 && <Text style={styles.starterNote}>🎁 {t('world_starter_power', { count: formatNumber(STARTER_BUILD_POWER) })}</Text>}
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  plotDiamondActive: { backgroundColor: 'rgba(255,243,186,0.94)', borderColor: '#3270EB', borderWidth: 3, shadowColor: '#FFFFFF', shadowOpacity: 0.9, shadowRadius: 9, elevation: 5 },
  plotDiamondIdle: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.6)', borderColor: 'rgba(50,112,235,0.42)', borderWidth: 2, transform: [] },
  plotTouchSelected: { borderWidth: 3, borderColor: '#3270EB', backgroundColor: 'rgba(255,255,255,0.16)' },
  screen: { flex: 1, backgroundColor: '#F8FCFF' }, content: { paddingHorizontal: 16, paddingBottom: 26, alignItems: 'center' },
  header: { width: '100%', maxWidth: 600, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 },
  eyebrow: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#53657D', marginBottom: -3 }, title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, color: '#081A4B' },
  powerValue: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3D6', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 }, powerText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#7C5600' },
  dailyRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 4, marginBottom: 12 }, dailyLabel: { fontFamily: 'Nunito_700Bold', color: '#53657D', fontSize: 12 }, dailyAmount: { fontFamily: 'Nunito_800ExtraBold', color: '#3270EB', fontSize: 12, minWidth: 68, textAlign: 'right' },
  progressTrack: { flex: 1, height: 9, backgroundColor: '#DDE8F3', borderRadius: 99, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: '#B8F23D', borderRadius: 99 },
  canvas: { width: '100%', maxWidth: 600, aspectRatio: 1082 / 1454, borderRadius: 30, overflow: 'hidden', backgroundColor: '#B9ECFF', shadowColor: '#183D79', shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 7 },
  townBoard: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  worldSprite: { position: 'absolute', width: '31%', aspectRatio: 1, zIndex: 4 }, worldSpriteTop: { width: '25%' },
  buildingSprite: { width: '100%', height: '100%' }, buildingLevelTwo: { transform: [{ scale: 1.035 }] }, buildingLevelThree: { transform: [{ scale: 1.07 }] },
  decorContainer: { position: 'absolute', width: '18%', aspectRatio: 1, zIndex: 4 }, decorSprite: { width: '100%', height: '100%' },
  levelSparkles: { position: 'absolute', left: 5, top: 9, padding: 3, borderRadius: 12, backgroundColor: 'rgba(50,112,235,0.74)' },
  levelFlag: { position: 'absolute', right: 6, bottom: 5, minWidth: 23, height: 23, paddingHorizontal: 5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' }, levelFlagText: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 11 },
  emptyPlot: { position: 'absolute', width: '17.5%', height: '9%', alignItems: 'center', justifyContent: 'center', zIndex: 3 }, plotDiamond: { position: 'absolute', width: 47, height: 47, borderRadius: 11, backgroundColor: 'rgba(225,255,184,0.92)', borderWidth: 3, borderColor: '#FFFFFF', transform: [{ rotate: '45deg' }, { scaleY: 0.66 }] }, plotPlus: { fontFamily: 'Nunito_800ExtraBold', fontSize: 26, color: '#3270EB', marginTop: -1 },
  plotTouch: { position: 'absolute', width: '19%', height: '15%', borderRadius: 50, zIndex: 20 }, worldHero: { position: 'absolute', left: 0, top: 0, zIndex: 30 },
  instructionRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 48, paddingVertical: 8 }, instruction: { flexShrink: 1, fontFamily: 'Nunito_700Bold', fontSize: 14, lineHeight: 20, color: '#53657D', textAlign: 'center' },
  upgradeRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#3270EB', borderRadius: 19, paddingHorizontal: 13, paddingVertical: 9, marginBottom: 14 }, upgradeDisabled: { backgroundColor: '#7B8A9E' }, upgradeTitle: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 15 }, upgradeMeta: { fontFamily: 'Nunito_600SemiBold', color: '#E8F0FF', fontSize: 12 },
  sectionTitle: { width: '100%', maxWidth: 600, fontFamily: 'Nunito_800ExtraBold', color: '#081A4B', fontSize: 18, marginHorizontal: 4 }, sectionHint: { width: '100%', maxWidth: 600, fontFamily: 'Nunito_600SemiBold', color: '#53657D', fontSize: 12, marginBottom: 5 }, trayScroll: { width: '100%', maxWidth: 600, flexGrow: 0 }, buildTray: { gap: 9, paddingHorizontal: 2, paddingTop: 5, paddingBottom: 10 },
  buildItem: { width: 106, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D9E2EF', shadowColor: '#081A4B', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, zIndex: 1 }, buildItemSelected: { borderColor: '#3270EB', backgroundColor: '#EDF4FF' }, buildItemDisabled: { opacity: 0.62 }, buildItemDragging: { zIndex: 100, elevation: 12, shadowOpacity: 0.25 }, buildItemPressable: { alignItems: 'center', paddingTop: 2, paddingBottom: 9, paddingHorizontal: 5 }, thumbnail: { width: 74, height: 70 }, buildName: { fontFamily: 'Nunito_800ExtraBold', color: '#081A4B', fontSize: 13, maxWidth: 96, textAlign: 'center' }, buildCost: { fontFamily: 'Nunito_700Bold', color: '#53657D', fontSize: 11, marginTop: 1 }, starterNote: { width: '100%', maxWidth: 600, fontFamily: 'Nunito_600SemiBold', color: '#53657D', fontSize: 12, textAlign: 'center', marginTop: 1 },
});
