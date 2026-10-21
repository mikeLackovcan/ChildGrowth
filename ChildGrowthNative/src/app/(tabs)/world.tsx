import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View,
  type ImageSourcePropType, type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Zap, Sparkles, ArrowUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useWorldStore } from '../../store/useWorldStore';
import QuestHero from '../../components/QuestHero';
import { playSound } from '../../lib/sound';
import {
  STARTER_BUILD_POWER, todayBuildPower, worldPowerBalance, WORLD_BUILDINGS,
  type WorldBuildingType, type WorldPlacement,
} from '../../lib/worldEconomy';

const MAP_WIDTH = 400;
const MAP_HEIGHT = 560;
const PLOTS = [
  { id: 'home', x: 84, y: 175 }, { id: 'north', x: 200, y: 142 },
  { id: 'north-east', x: 316, y: 175 }, { id: 'west', x: 62, y: 292 },
  { id: 'mid-west', x: 154, y: 282 }, { id: 'mid-east', x: 246, y: 282 },
  { id: 'east', x: 338, y: 292 }, { id: 'south-west', x: 92, y: 416 },
  { id: 'south', x: 200, y: 446 }, { id: 'south-east', x: 308, y: 416 },
] as const;

const KAYKIT = {
  buildingA: require('../../../assets/world/kaykit/building_A.png'),
  buildingB: require('../../../assets/world/kaykit/building_B.png'),
  buildingC: require('../../../assets/world/kaykit/building_C.png'),
  buildingD: require('../../../assets/world/kaykit/building_D.png'),
  buildingE: require('../../../assets/world/kaykit/building_E.png'),
  buildingF: require('../../../assets/world/kaykit/building_F.png'),
  buildingG: require('../../../assets/world/kaykit/building_G.png'),
  buildingH: require('../../../assets/world/kaykit/building_H.png'),
  bench: require('../../../assets/world/kaykit/bench.png'),
  bush: require('../../../assets/world/kaykit/bush.png'),
  light: require('../../../assets/world/kaykit/streetlight.png'),
  waterTower: require('../../../assets/world/kaykit/watertower.png'),
  roadStraight: require('../../../assets/world/kaykit/road_straight.png'),
  roadJunction: require('../../../assets/world/kaykit/road_junction.png'),
  roadSplit: require('../../../assets/world/kaykit/road_tsplit.png'),
  car: require('../../../assets/world/kaykit/car_hatchback.png'),
} as const;

type MainBuilding = Exclude<WorldBuildingType, 'park' | 'tree' | 'bench' | 'streetlight'>;
const BUILDING_SPRITES: Record<MainBuilding, ImageSourcePropType[]> = {
  home: [KAYKIT.buildingA, KAYKIT.buildingE, KAYKIT.buildingH],
  bakery: [KAYKIT.buildingB, KAYKIT.buildingC, KAYKIT.buildingE],
  school: [KAYKIT.buildingD, KAYKIT.buildingG, KAYKIT.buildingH],
  library: [KAYKIT.buildingC, KAYKIT.buildingD, KAYKIT.buildingG],
  clubhouse: [KAYKIT.buildingA, KAYKIT.buildingF, KAYKIT.buildingH],
  cafe: [KAYKIT.buildingA, KAYKIT.buildingB, KAYKIT.buildingE],
  studio: [KAYKIT.buildingC, KAYKIT.buildingF, KAYKIT.buildingG],
};

function TownBase() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#8ADFFF" /><Stop offset="0.72" stopColor="#E7F8FF" /><Stop offset="1" stopColor="#F8FCFF" /></LinearGradient>
        <LinearGradient id="cliff" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#9C6D54" /><Stop offset="1" stopColor="#665277" /></LinearGradient>
        <LinearGradient id="grass" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#A9E96B" /><Stop offset="0.55" stopColor="#67CD63" /><Stop offset="1" stopColor="#45B864" /></LinearGradient>
      </Defs>
      <Rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#sky)" />
      <G opacity="0.74" fill="#FFFFFF"><Ellipse cx="62" cy="60" rx="54" ry="18" /><Ellipse cx="340" cy="78" rx="57" ry="18" /></G>
      <Path d="M20 131 Q200 25 380 131 L360 476 Q200 554 40 476 Z" fill="#346F91" opacity="0.2" />
      <Path d="M24 124 Q200 30 376 124 L354 460 Q200 531 46 460 Z" fill="url(#cliff)" />
      <Path d="M25 117 Q200 24 375 117 Q362 407 200 485 Q38 407 25 117 Z" fill="url(#grass)" stroke="#3CA452" strokeWidth="5" />
      <Path d="M36 245 Q200 180 364 245 M43 365 Q200 302 357 365 M200 64 V466" stroke="#E8D6B5" strokeWidth="33" fill="none" strokeLinecap="round" />
      <Path d="M36 245 Q200 180 364 245 M43 365 Q200 302 357 365 M200 64 V466" stroke="#F7EED9" strokeWidth="26" fill="none" strokeLinecap="round" />
      <Path d="M36 245 Q200 180 364 245 M43 365 Q200 302 357 365 M200 64 V466" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeDasharray="7 8" opacity="0.7" />
      <Ellipse cx="200" cy="282" rx="39" ry="24" fill="#BFEFFF" stroke="#FFFFFF" strokeWidth="5" />
      <Ellipse cx="200" cy="282" rx="28" ry="16" fill="#40B8E8" />
      <Path d="M200 258 Q183 279 200 288 Q217 279 200 258" fill="#D9F8FF" />
      <Ellipse cx="200" cy="486" rx="156" ry="17" fill="#1D526B" opacity="0.15" />
    </Svg>
  );
}

function SpriteImage({ source, style }: { source: ImageSourcePropType; style?: object }) {
  return <Image source={source} resizeMode="contain" fadeDuration={0} style={style} />;
}

function WorldItemSprite({ placement, x, y }: { placement: WorldPlacement; x: number; y: number }) {
  const { type, level } = placement;
  const position = { left: `${((x - 61) / MAP_WIDTH) * 100}%`, top: `${((y - 98) / MAP_HEIGHT) * 100}%` } as const;
  if (type === 'park') {
    return <View pointerEvents="none" style={[styles.worldSprite, position]}>
      <View style={styles.parkPatch} /><SpriteImage source={KAYKIT.bush} style={[styles.parkBush, { left: 7, top: 19 }]} />
      {level >= 2 && <SpriteImage source={KAYKIT.bench} style={styles.parkBench} />}
      {level >= 3 && <SpriteImage source={KAYKIT.waterTower} style={styles.parkFeature} />}
    </View>;
  }
  if (type === 'tree' || type === 'bench' || type === 'streetlight') {
    const source = type === 'tree' ? KAYKIT.bush : type === 'bench' ? KAYKIT.bench : KAYKIT.light;
    return <View pointerEvents="none" style={[styles.worldSprite, position]}><SpriteImage source={source} style={styles.decorSprite} /></View>;
  }
  return <View pointerEvents="none" style={[styles.worldSprite, position]}>
    <SpriteImage source={BUILDING_SPRITES[type][Math.min(level - 1, 2)]} style={styles.buildingSprite} />
    <View style={[styles.levelFlag, { backgroundColor: WORLD_BUILDINGS[type].color }]}><Text style={styles.levelFlagText}>{level}</Text></View>
  </View>;
}

function RoadAndLifeLayer() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <SpriteImage source={KAYKIT.roadJunction} style={[styles.roadTile, { left: '34%', top: '37%' }]} />
    <SpriteImage source={KAYKIT.roadStraight} style={[styles.roadTile, { left: '8%', top: '37%' }]} />
    <SpriteImage source={KAYKIT.roadStraight} style={[styles.roadTile, { right: '8%', top: '37%' }]} />
    <SpriteImage source={KAYKIT.roadSplit} style={[styles.roadTile, { left: '34%', top: '57%' }]} />
    <SpriteImage source={KAYKIT.car} style={[styles.townCar, { left: '43%', top: '48%' }]} />
    <SpriteImage source={KAYKIT.bush} style={[styles.ambientBush, { left: '1%', top: '41%' }]} />
    <SpriteImage source={KAYKIT.bush} style={[styles.ambientBush, { right: '1%', top: '57%' }]} />
    <SpriteImage source={KAYKIT.light} style={[styles.ambientLight, { left: '46%', top: '27%' }]} />
  </View>;
}

function EmptyPlot({ x, y }: { x: number; y: number }) {
  return <View pointerEvents="none" style={[styles.emptyPlot, { left: `${((x - 35) / MAP_WIDTH) * 100}%`, top: `${((y - 22) / MAP_HEIGHT) * 100}%` }]}>
    <View style={styles.plotDiamond} /><Text style={styles.plotPlus}>＋</Text>
  </View>;
}

function ItemThumbnail({ type }: { type: WorldBuildingType }) {
  let source: ImageSourcePropType;
  if (type === 'park' || type === 'tree') source = KAYKIT.bush;
  else if (type === 'bench') source = KAYKIT.bench;
  else if (type === 'streetlight') source = KAYKIT.light;
  else source = BUILDING_SPRITES[type][0];
  return <SpriteImage source={source} style={styles.thumbnail} />;
}

function DraggableBuildItem({ type, available, selected, label, onSelect, onDrop }: {
  type: WorldBuildingType; available: boolean; selected: boolean; label: string;
  onSelect: () => void; onDrop: (type: WorldBuildingType, pageX: number, pageY: number) => void;
}) {
  const translation = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);
  const item = WORLD_BUILDINGS[type];
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => available,
    onMoveShouldSetPanResponder: (_, gesture) => available && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
    onPanResponderGrant: () => { setDragging(true); translation.setOffset({ x: (translation.x as any)._value, y: (translation.y as any)._value }); translation.setValue({ x: 0, y: 0 }); void Haptics.selectionAsync(); },
    onPanResponderMove: Animated.event([null, { dx: translation.x, dy: translation.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => { translation.flattenOffset(); setDragging(false); onDrop(type, gesture.moveX, gesture.moveY); Animated.spring(translation, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start(); },
    onPanResponderTerminate: () => { translation.flattenOffset(); setDragging(false); Animated.spring(translation, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start(); },
  }), [available, onDrop, translation, type]);
  return <Animated.View {...panResponder.panHandlers} style={[styles.buildItem, selected && styles.buildItemSelected, !available && styles.buildItemDisabled, dragging && styles.buildItemDragging, { transform: translation.getTranslateTransform() }]}>
    <Pressable disabled={!available} accessibilityRole="button" accessibilityLabel={`${label}, ${item.cost} build power`} onPress={onSelect} style={styles.buildItemPressable}>
      <ItemThumbnail type={type} /><Text numberOfLines={1} style={styles.buildName}>{label}</Text>
      <Text style={styles.buildCost}>{item.cost >= 1000 ? `${item.cost / 1000}K` : item.cost} ⚡</Text>
    </Pressable>
  </Animated.View>;
}

export default function MyWorldScreen() {
  const { t } = useTranslation();
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
  const canvasRef = useRef<View>(null);
  const heroPosition = useRef(new Animated.ValueXY({ x: 165, y: 310 })).current;
  useEffect(() => { void world.hydrate(ownerKey); }, [ownerKey]);
  useEffect(() => { setMessage(t('world_drag_hint')); }, [app.language, t]);
  const itemName = (type: WorldBuildingType) => t(WORLD_BUILDINGS[type].nameKey);

  const runHeroTo = (plotId: string) => {
    const plot = PLOTS.find(item => item.id === plotId) || PLOTS[0];
    const x = (plot.x / MAP_WIDTH) * canvasSize.width - 24;
    const y = (plot.y / MAP_HEIGHT) * canvasSize.height - 24;
    Animated.sequence([
      Animated.timing(heroPosition, { toValue: { x, y }, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(heroPosition, { toValue: { x, y: y - 12 }, friction: 3, useNativeDriver: true }),
      Animated.spring(heroPosition, { toValue: { x, y }, friction: 4, useNativeDriver: true }),
    ]).start();
  };
  const place = (plotId: string, type: WorldBuildingType) => {
    if (!world.placeBuilding(plotId, type, availablePower)) {
      setMessage(availablePower < WORLD_BUILDINGS[type].cost ? t('world_need_power') : t('world_choose_empty'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return;
    }
    runHeroTo(plotId); setSelectedType(null); setSelectedPlot(plotId);
    setMessage(t('world_built', { item: itemName(type) })); playSound('unlock');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const drop = (type: WorldBuildingType, pageX: number, pageY: number) => canvasRef.current?.measureInWindow((left, top, width, height) => {
    const x = ((pageX - left) / width) * MAP_WIDTH; const y = ((pageY - top) / height) * MAP_HEIGHT;
    const target = PLOTS.filter(plot => !world.placements.some(item => item.plotId === plot.id)).map(plot => ({ plot, distance: Math.hypot(plot.x - x, plot.y - y) })).sort((a, b) => a.distance - b.distance)[0];
    if (!target || target.distance > 64) { setMessage(t('world_drop_hint')); return; }
    place(target.plot.id, type);
  });
  const pressPlot = (plotId: string) => {
    const existing = world.placements.find(item => item.plotId === plotId);
    if (!existing && selectedType) { place(plotId, selectedType); return; }
    setSelectedPlot(plotId);
    setMessage(existing ? t('world_item_level', { item: itemName(existing.type), level: existing.level }) : t('world_choose_below'));
  };
  const upgrade = () => {
    if (!selectedPlot) return;
    const building = world.placements.find(item => item.plotId === selectedPlot); if (!building) return;
    if (!world.upgradeBuilding(selectedPlot, availablePower)) { setMessage(building.level >= WORLD_BUILDINGS[building.type].maxLevel ? t('world_max_level') : t('world_need_power')); return; }
    runHeroTo(selectedPlot); setMessage(t('world_upgraded', { item: itemName(building.type) })); playSound('unlock'); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const onCanvasLayout = (event: LayoutChangeEvent) => { const { width, height } = event.nativeEvent.layout; setCanvasSize({ width, height }); heroPosition.setValue({ x: width * 0.42, y: height * 0.57 }); };
  const currentBuilding = selectedPlot ? world.placements.find(item => item.plotId === selectedPlot) : null;
  const currentMeta = currentBuilding ? WORLD_BUILDINGS[currentBuilding.type] : null;
  const nextUpgrade = currentBuilding && currentMeta ? currentMeta.upgradeCost * currentBuilding.level : 0;
  const firstName = (app.fullName || app.nickname || '').split(' ')[0];

  return <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View>{firstName ? <Text style={styles.eyebrow}>{t('world_owners', { name: firstName })}</Text> : null}<Text style={styles.title}>{t('tab_world')}</Text></View>
      <View style={styles.powerValue} accessibilityLabel={t('world_power_available', { count: availablePower })}><Zap size={21} color="#7C5600" fill="#F6B83F" /><Text style={styles.powerText}>{availablePower.toLocaleString()}</Text></View>
    </View>
    <View style={styles.dailyRow}><Text style={styles.dailyLabel}>{t('world_today')}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(4, earnedToday / 100)}%` }]} /></View><Text style={styles.dailyAmount}>+{earnedToday.toLocaleString()} ⚡</Text></View>
    <View ref={canvasRef} collapsable={false} style={styles.canvas} onLayout={onCanvasLayout}>
      <TownBase /><RoadAndLifeLayer />
      {PLOTS.map(plot => { const placement = world.placements.find(item => item.plotId === plot.id); return placement ? <WorldItemSprite key={plot.id} placement={placement} x={plot.x} y={plot.y} /> : <EmptyPlot key={plot.id} x={plot.x} y={plot.y} />; })}
      {PLOTS.map(plot => { const placement = world.placements.find(item => item.plotId === plot.id); return <Pressable key={`touch-${plot.id}`} accessibilityRole="button" accessibilityLabel={placement ? itemName(placement.type) : t('world_empty_plot')} onPress={() => pressPlot(plot.id)} style={[styles.plotTouch, { left: `${((plot.x - 38) / MAP_WIDTH) * 100}%`, top: `${((plot.y - 42) / MAP_HEIGHT) * 100}%` }]} />; })}
      <Animated.View pointerEvents="none" style={[styles.worldHero, { transform: heroPosition.getTranslateTransform() }]}><QuestHero id={app.currentAvatar} style={styles.heroImage} /></Animated.View>
    </View>
    <View style={styles.instructionRow}><Sparkles size={18} color="#3270EB" /><Text style={styles.instruction}>{message}</Text></View>
    {currentBuilding && currentMeta && currentMeta.maxLevel > 1 && <Pressable accessibilityRole="button" disabled={currentBuilding.level >= currentMeta.maxLevel} onPress={upgrade} style={[styles.upgradeRow, currentBuilding.level >= currentMeta.maxLevel && styles.upgradeDisabled]}>
      <ItemThumbnail type={currentBuilding.type} /><View style={{ flex: 1 }}><Text style={styles.upgradeTitle}>{t('world_item_level', { item: itemName(currentBuilding.type), level: currentBuilding.level })}</Text><Text style={styles.upgradeMeta}>{currentBuilding.level >= currentMeta.maxLevel ? t('world_max_level') : t('world_power_cost', { count: nextUpgrade.toLocaleString() })}</Text></View>{currentBuilding.level < currentMeta.maxLevel && <ArrowUp size={22} color="#FFFFFF" />}
    </Pressable>}
    <Text style={styles.sectionTitle}>{t('world_build_decorate')}</Text><Text style={styles.sectionHint}>{t('world_tap_or_drag')}</Text>
    <ScrollView horizontal style={styles.trayScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buildTray}>{(Object.keys(WORLD_BUILDINGS) as WorldBuildingType[]).map(type => <DraggableBuildItem key={type} type={type} label={itemName(type)} available={availablePower >= WORLD_BUILDINGS[type].cost} selected={selectedType === type} onSelect={() => { setSelectedType(type); setMessage(t('world_selected_hint', { item: itemName(type) })); }} onDrop={drop} />)}</ScrollView>
    {world.spentPower === 0 && <Text style={styles.starterNote}>🎁 {t('world_starter_power', { count: STARTER_BUILD_POWER.toLocaleString() })}</Text>}
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FCFF' }, content: { paddingHorizontal: 16, paddingBottom: 26, alignItems: 'center' },
  header: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 },
  eyebrow: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#53657D', marginBottom: -3 }, title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, color: '#081A4B' },
  powerValue: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3D6', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 }, powerText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#7C5600' },
  dailyRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 4, marginBottom: 12 }, dailyLabel: { fontFamily: 'Nunito_700Bold', color: '#53657D', fontSize: 12 }, dailyAmount: { fontFamily: 'Nunito_800ExtraBold', color: '#3270EB', fontSize: 12, minWidth: 68, textAlign: 'right' },
  progressTrack: { flex: 1, height: 9, backgroundColor: '#DDE8F3', borderRadius: 99, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: '#B8F23D', borderRadius: 99 },
  canvas: { width: '100%', maxWidth: 600, aspectRatio: MAP_WIDTH / MAP_HEIGHT, borderRadius: 30, overflow: 'hidden', backgroundColor: '#B9ECFF', shadowColor: '#3270EB', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  roadTile: { position: 'absolute', width: '32%', height: '19%' }, townCar: { position: 'absolute', width: '14%', height: '10%' }, ambientBush: { position: 'absolute', width: '12%', height: '10%' }, ambientLight: { position: 'absolute', width: '9%', height: '15%' },
  worldSprite: { position: 'absolute', width: '30.5%', height: '22%', zIndex: 4 }, buildingSprite: { width: '100%', height: '100%' }, decorSprite: { width: '74%', height: '74%', alignSelf: 'center', marginTop: 24 },
  parkPatch: { position: 'absolute', left: 15, right: 15, bottom: 20, height: 45, borderRadius: 999, backgroundColor: '#8CDA68', transform: [{ scaleY: 0.55 }], borderWidth: 2, borderColor: '#5BB84E' }, parkBush: { position: 'absolute', width: 62, height: 62 }, parkBench: { position: 'absolute', width: 72, height: 72, right: 3, bottom: 8 }, parkFeature: { position: 'absolute', width: 56, height: 70, right: 10, top: 0 },
  levelFlag: { position: 'absolute', right: 9, bottom: 14, minWidth: 23, height: 23, paddingHorizontal: 5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' }, levelFlagText: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 11 },
  emptyPlot: { position: 'absolute', width: '17.5%', height: '9%', alignItems: 'center', justifyContent: 'center', zIndex: 3 }, plotDiamond: { position: 'absolute', width: 47, height: 47, borderRadius: 11, backgroundColor: 'rgba(225,255,184,0.92)', borderWidth: 3, borderColor: '#FFFFFF', transform: [{ rotate: '45deg' }, { scaleY: 0.66 }] }, plotPlus: { fontFamily: 'Nunito_800ExtraBold', fontSize: 26, color: '#3270EB', marginTop: -1 },
  plotTouch: { position: 'absolute', width: '19%', height: '15%', borderRadius: 50, zIndex: 20 }, worldHero: { position: 'absolute', left: 0, top: 0, width: 48, height: 72, zIndex: 30 }, heroImage: { width: 48, height: 72 },
  instructionRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 42 }, instruction: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#53657D', textAlign: 'center' },
  upgradeRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#3270EB', borderRadius: 19, paddingHorizontal: 13, paddingVertical: 9, marginBottom: 14 }, upgradeDisabled: { backgroundColor: '#7B8A9E' }, upgradeTitle: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 15 }, upgradeMeta: { fontFamily: 'Nunito_600SemiBold', color: '#E8F0FF', fontSize: 12 },
  sectionTitle: { width: '100%', maxWidth: 600, fontFamily: 'Nunito_800ExtraBold', color: '#081A4B', fontSize: 18, marginHorizontal: 4 }, sectionHint: { width: '100%', maxWidth: 600, fontFamily: 'Nunito_600SemiBold', color: '#53657D', fontSize: 12, marginBottom: 5 }, trayScroll: { width: '100%', maxWidth: 600, flexGrow: 0 }, buildTray: { gap: 9, paddingHorizontal: 2, paddingTop: 5, paddingBottom: 10 },
  buildItem: { width: 90, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D9E2EF', shadowColor: '#081A4B', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, zIndex: 1 }, buildItemSelected: { borderColor: '#3270EB', backgroundColor: '#EDF4FF' }, buildItemDisabled: { opacity: 0.42 }, buildItemDragging: { zIndex: 100, elevation: 12, shadowOpacity: 0.25 }, buildItemPressable: { alignItems: 'center', paddingTop: 3, paddingBottom: 8, paddingHorizontal: 4 }, thumbnail: { width: 58, height: 53 }, buildName: { fontFamily: 'Nunito_800ExtraBold', color: '#081A4B', fontSize: 11, maxWidth: 80 }, buildCost: { fontFamily: 'Nunito_700Bold', color: '#53657D', fontSize: 10, marginTop: 1 }, starterNote: { width: '100%', maxWidth: 600, fontFamily: 'Nunito_600SemiBold', color: '#53657D', fontSize: 12, textAlign: 'center', marginTop: 1 },
});
