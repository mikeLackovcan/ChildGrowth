import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Zap, Sparkles, ArrowUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { useWorldStore } from '../../store/useWorldStore';
import QuestHero from '../../components/QuestHero';
import { playSound } from '../../lib/sound';
import {
  STARTER_BUILD_POWER,
  todayBuildPower,
  worldPowerBalance,
  WORLD_BUILDINGS,
  type WorldBuildingType,
  type WorldPlacement,
} from '../../lib/worldEconomy';
import { Colors } from '../../constants/theme';

const MAP_WIDTH = 400;
const MAP_HEIGHT = 470;

const PLOTS = [
  { id: 'home', x: 118, y: 188 },
  { id: 'north', x: 282, y: 174 },
  { id: 'west', x: 112, y: 330 },
  { id: 'east', x: 292, y: 325 },
] as const;

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Ellipse cx="0" cy="18" rx="18" ry="7" fill="#356F3B" opacity="0.22" />
      <Rect x="-4" y="-2" width="8" height="24" rx="3" fill="#9A6339" />
      <Circle cx="0" cy="-7" r="17" fill="#55AE46" />
      <Circle cx="-10" cy="-2" r="11" fill="#6AC957" />
      <Circle cx="9" cy="-1" r="12" fill="#3F9840" />
      <Circle cx="-4" cy="-13" r="10" fill="#7BD966" />
    </G>
  );
}

function Building({ placement, x, y }: { placement: WorldPlacement; x: number; y: number }) {
  const { type, level } = placement;
  const scale = 0.9 + level * 0.06;

  if (type === 'park') {
    return (
      <G transform={`translate(${x} ${y}) scale(${scale})`}>
        <Ellipse cx="0" cy="4" rx="43" ry="21" fill="#8CD95D" stroke="#5DB443" strokeWidth="3" />
        <Tree x={-12} y={-12} scale={0.75 + level * 0.08} />
        <Path d="M8 -5 L30 10" stroke="#3270EB" strokeWidth="5" strokeLinecap="round" />
        <Path d="M27 10 L39 10" stroke="#FFB83F" strokeWidth="6" strokeLinecap="round" />
        <Circle cx="18" cy="-7" r="5" fill="#FF806C" />
        {level > 1 && <Path d="M-37 3 Q0 28 37 3" stroke="#FFF4CE" strokeWidth="5" fill="none" />}
        {level > 2 && <Circle cx="31" cy="-9" r="8" fill="#F6B83F" stroke="#FFFFFF" strokeWidth="2" />}
      </G>
    );
  }

  const bakery = type === 'bakery';
  const school = type === 'school';
  const wall = bakery ? '#FFF0D6' : school ? '#FFE09A' : '#F8FBFF';
  const roof = bakery ? '#FF806C' : school ? '#F6B83F' : '#3270EB';
  const width = school ? 88 : 70;
  const left = -width / 2;
  const height = 52 + (level - 1) * 10;

  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Ellipse cx="0" cy="12" rx={width * 0.62} ry="15" fill="#315A44" opacity="0.2" />
      <Rect x={left} y={-height + 10} width={width} height={height} rx="8" fill={wall} stroke="#D6C7A0" strokeWidth="2" />
      {level > 1 && <Rect x={left + 8} y={-height - 9} width={width - 16} height="27" rx="5" fill={wall} stroke="#D6C7A0" strokeWidth="2" />}
      <Polygon points={`${left - 8},${-height + 14} 0,${-height - 24} ${-left + 8},${-height + 14}`} fill={roof} stroke="#2457BE" strokeWidth="2" />
      <Rect x="-9" y="-25" width="18" height="35" rx="7" fill="#A86939" />
      <Circle cx="0" cy="-9" r="2" fill="#F8CF55" />
      <Rect x={left + 10} y="-30" width="14" height="17" rx="4" fill="#8DD9FF" stroke="#FFFFFF" strokeWidth="3" />
      <Rect x={-left - 24} y="-30" width="14" height="17" rx="4" fill="#8DD9FF" stroke="#FFFFFF" strokeWidth="3" />
      {bakery && (
        <G>
          <Path d={`M${left + 4} -42 H${-left - 4}`} stroke="#FFFFFF" strokeWidth="8" />
          <Path d={`M${left + 4} -42 H${-left - 4}`} stroke="#FF806C" strokeWidth="4" strokeDasharray="9 8" />
          <Ellipse cx="0" cy={-height - 5} rx="15" ry="8" fill="#FFFFFF" />
          <SvgText x="0" y={-height - 1} textAnchor="middle" fontSize="12">🥐</SvgText>
        </G>
      )}
      {school && (
        <G>
          <Circle cx="0" cy={-height + 2} r="11" fill="#FFFFFF" stroke="#3270EB" strokeWidth="3" />
          <Path d={`M0 ${-height + 2} L0 ${-height - 4} M0 ${-height + 2} L5 ${-height + 5}`} stroke="#081A4B" strokeWidth="2" strokeLinecap="round" />
          <Path d={`M0 ${-height - 24} V${-height - 40} L18 ${-height - 34} L0 ${-height - 28}`} fill="#3270EB" />
        </G>
      )}
      {level > 2 && <Circle cx={-left - 2} cy={-height - 18} r="7" fill="#B8F23D" stroke="#FFFFFF" strokeWidth="2" />}
    </G>
  );
}

function TownMap({ placements }: { placements: WorldPlacement[] }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A8E8FF" />
          <Stop offset="1" stopColor="#EDF9FF" />
        </LinearGradient>
        <LinearGradient id="cliff" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C38B63" />
          <Stop offset="1" stopColor="#77517B" />
        </LinearGradient>
        <LinearGradient id="grass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B9F46B" />
          <Stop offset="1" stopColor="#5CC85B" />
        </LinearGradient>
      </Defs>
      <Rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#sky)" />

      <G opacity="0.72" fill="#FFFFFF">
        <Ellipse cx="65" cy="70" rx="50" ry="20" /><Circle cx="42" cy="59" r="21" /><Circle cx="78" cy="53" r="27" />
        <Ellipse cx="345" cy="91" rx="52" ry="18" /><Circle cx="326" cy="80" r="21" /><Circle cx="362" cy="73" r="28" />
      </G>
      <Ellipse cx="200" cy="396" rx="172" ry="29" fill="#3E6591" opacity="0.16" />
      <Path d="M25 155 Q200 53 375 155 L354 367 Q200 449 46 367 Z" fill="url(#cliff)" />
      <Path d="M26 152 Q200 50 374 152 Q350 335 200 386 Q50 335 26 152 Z" fill="url(#grass)" stroke="#4DAD52" strokeWidth="5" />
      <Path d="M52 172 Q198 98 347 171 M57 319 Q198 238 343 318 M198 104 Q162 220 198 374 M201 106 Q245 214 201 376" stroke="#FFECC5" strokeWidth="18" fill="none" strokeLinecap="round" opacity="0.94" />
      <Path d="M52 172 Q198 98 347 171 M57 319 Q198 238 343 318 M198 104 Q162 220 198 374 M201 106 Q245 214 201 376" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55" />

      <G>
        <Ellipse cx="201" cy="250" rx="39" ry="23" fill="#DBF7FF" stroke="#FFFFFF" strokeWidth="5" />
        <Ellipse cx="201" cy="250" rx="29" ry="15" fill="#43BFF2" />
        <Rect x="195" y="224" width="12" height="28" rx="5" fill="#FFF3D6" />
        <Circle cx="201" cy="220" r="13" fill="#F6B83F" stroke="#FFFFFF" strokeWidth="3" />
        <Path d="M201 217 Q184 232 201 239 Q218 232 201 217" fill="#8FE4FF" />
      </G>

      <Tree x={52} y={210} scale={0.72} />
      <Tree x={350} y={231} scale={0.78} />
      <Tree x={199} y={343} scale={0.68} />
      <Tree x={203} y={134} scale={0.62} />
      <Tree x={55} y={300} scale={0.58} />
      <Tree x={349} y={300} scale={0.58} />

      {PLOTS.map(plot => {
        const placement = placements.find(item => item.plotId === plot.id);
        if (placement) return <Building key={plot.id} placement={placement} x={plot.x} y={plot.y} />;
        return (
          <G key={plot.id}>
            <Polygon
              points={`${plot.x},${plot.y - 27} ${plot.x + 45},${plot.y} ${plot.x},${plot.y + 27} ${plot.x - 45},${plot.y}`}
              fill="#DDF7A4"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeDasharray="8 7"
            />
            <Circle cx={plot.x} cy={plot.y} r="15" fill="#FFFFFF" opacity="0.95" />
            <Path d={`M${plot.x - 7} ${plot.y} H${plot.x + 7} M${plot.x} ${plot.y - 7} V${plot.y + 7}`} stroke="#3270EB" strokeWidth="4" strokeLinecap="round" />
          </G>
        );
      })}

      <G opacity="0.7">
        <Path d="M61 364 Q72 386 61 410" stroke="#8DE6FF" strokeWidth="14" strokeLinecap="round" />
        <Path d="M339 362 Q326 388 337 413" stroke="#8DE6FF" strokeWidth="14" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function DraggableBuildItem({
  type,
  available,
  selected,
  onSelect,
  onDrop,
}: {
  type: WorldBuildingType;
  available: boolean;
  selected: boolean;
  onSelect: () => void;
  onDrop: (type: WorldBuildingType, pageX: number, pageY: number) => void;
}) {
  const translation = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);
  const item = WORLD_BUILDINGS[type];
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => available,
    onMoveShouldSetPanResponder: (_, gesture) => available && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
    onPanResponderGrant: () => {
      setDragging(true);
      translation.setOffset({ x: (translation.x as any)._value, y: (translation.y as any)._value });
      translation.setValue({ x: 0, y: 0 });
      void Haptics.selectionAsync();
    },
    onPanResponderMove: Animated.event([null, { dx: translation.x, dy: translation.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => {
      translation.flattenOffset();
      setDragging(false);
      onDrop(type, gesture.moveX, gesture.moveY);
      Animated.spring(translation, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start();
    },
    onPanResponderTerminate: () => {
      translation.flattenOffset();
      setDragging(false);
      Animated.spring(translation, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
  }), [available, onDrop, translation, type]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.buildItem,
        selected && styles.buildItemSelected,
        !available && styles.buildItemDisabled,
        dragging && styles.buildItemDragging,
        { transform: translation.getTranslateTransform() },
      ]}
    >
      <Pressable disabled={!available} accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.cost} build power. Drag onto a glowing plot.`} onPress={onSelect} style={styles.buildItemPressable}>
        <Text style={styles.buildEmoji}>{item.icon}</Text>
        <Text style={styles.buildName}>{item.name}</Text>
        <Text style={styles.buildCost}>{item.cost / 1000}K ⚡</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function MyWorldScreen() {
  const insets = useSafeAreaInsets();
  const app = useAppStore();
  const world = useWorldStore();
  const ownerKey = app.userId || app.nickname || 'guest-local';
  const availablePower = worldPowerBalance(app.totalEarned, world.spentPower);
  const earnedToday = todayBuildPower(app.tasks);
  const [selectedType, setSelectedType] = useState<WorldBuildingType | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
  const [message, setMessage] = useState('Drag something onto a glowing plot');
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const canvasRef = useRef<View>(null);
  const heroPosition = useRef(new Animated.ValueXY({ x: 165, y: 265 })).current;

  useEffect(() => {
    void world.hydrate(ownerKey);
  }, [ownerKey]);

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
    const placed = world.placeBuilding(plotId, type, availablePower);
    if (!placed) {
      setMessage(availablePower < WORLD_BUILDINGS[type].cost ? 'Finish quests for more power' : 'Choose an empty plot');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    runHeroTo(plotId);
    setSelectedType(null);
    setSelectedPlot(plotId);
    setMessage(`${WORLD_BUILDINGS[type].name} built!`);
    playSound('unlock');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const drop = (type: WorldBuildingType, pageX: number, pageY: number) => {
    canvasRef.current?.measureInWindow((left, top, width, height) => {
      const x = ((pageX - left) / width) * MAP_WIDTH;
      const y = ((pageY - top) / height) * MAP_HEIGHT;
      const target = PLOTS
        .filter(plot => !world.placements.some(item => item.plotId === plot.id))
        .map(plot => ({ plot, distance: Math.hypot(plot.x - x, plot.y - y) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (!target || target.distance > 68) {
        setMessage('Drop it on a glowing plot');
        return;
      }
      place(target.plot.id, type);
    });
  };

  const pressPlot = (plotId: string) => {
    const existing = world.placements.find(item => item.plotId === plotId);
    if (!existing && selectedType) {
      place(plotId, selectedType);
      return;
    }
    setSelectedPlot(plotId);
    setMessage(existing ? `${WORLD_BUILDINGS[existing.type].name} · Level ${existing.level}` : 'Choose below, then tap here');
  };

  const upgrade = () => {
    if (!selectedPlot) return;
    const building = world.placements.find(item => item.plotId === selectedPlot);
    if (!building) return;
    const success = world.upgradeBuilding(selectedPlot, availablePower);
    if (!success) {
      setMessage(building.level >= 3 ? 'Already at max level!' : 'Finish quests for more power');
      return;
    }
    runHeroTo(selectedPlot);
    setMessage(`${WORLD_BUILDINGS[building.type].name} upgraded!`);
    playSound('unlock');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
    heroPosition.setValue({ x: width * 0.42, y: height * 0.58 });
  };

  const currentBuilding = selectedPlot ? world.placements.find(item => item.plotId === selectedPlot) : null;
  const nextUpgrade = currentBuilding ? WORLD_BUILDINGS[currentBuilding.type].upgradeCost * currentBuilding.level : 0;
  const firstName = (app.fullName || app.nickname || '').split(' ')[0];

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            {firstName ? <Text style={styles.eyebrow}>{firstName}’s</Text> : null}
            <Text style={styles.title}>My World</Text>
          </View>
          <View style={styles.powerValue} accessibilityLabel={`${availablePower} build power available`}>
            <Zap size={21} color="#7C5600" fill="#F6B83F" />
            <Text style={styles.powerText}>{availablePower.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.dailyRow}>
          <Text style={styles.dailyLabel}>Today</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(4, earnedToday / 100)}%` }]} />
          </View>
          <Text style={styles.dailyAmount}>+{earnedToday.toLocaleString()} ⚡</Text>
        </View>

        <View ref={canvasRef} collapsable={false} style={styles.canvas} onLayout={onCanvasLayout}>
          <TownMap placements={world.placements} />
          {PLOTS.map(plot => (
            <Pressable
              key={plot.id}
              accessibilityRole="button"
              accessibilityLabel={world.placements.some(item => item.plotId === plot.id) ? 'Open building' : 'Empty building plot'}
              onPress={() => pressPlot(plot.id)}
              style={[
                styles.plotTouch,
                { left: `${((plot.x - 42) / MAP_WIDTH) * 100}%`, top: `${((plot.y - 38) / MAP_HEIGHT) * 100}%` },
              ]}
            />
          ))}
          <Animated.View pointerEvents="none" style={[styles.worldHero, { transform: heroPosition.getTranslateTransform() }]}>
            <QuestHero id={app.currentAvatar} style={styles.heroImage} />
          </Animated.View>
        </View>

        <View style={styles.instructionRow}>
          <Sparkles size={18} color="#3270EB" />
          <Text style={styles.instruction}>{message}</Text>
        </View>

        {currentBuilding && (
          <Pressable
            accessibilityRole="button"
            disabled={currentBuilding.level >= 3}
            onPress={upgrade}
            style={[styles.upgradeRow, currentBuilding.level >= 3 && styles.upgradeDisabled]}
          >
            <Text style={styles.upgradeIcon}>{WORLD_BUILDINGS[currentBuilding.type].icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>{WORLD_BUILDINGS[currentBuilding.type].name} · Level {currentBuilding.level}</Text>
              <Text style={styles.upgradeMeta}>{currentBuilding.level >= 3 ? 'Max level' : `${nextUpgrade.toLocaleString()} build power`}</Text>
            </View>
            {currentBuilding.level < 3 && <ArrowUp size={22} color="#FFFFFF" />}
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Drag to build</Text>
        <ScrollView horizontal style={styles.trayScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buildTray}>
          {(Object.keys(WORLD_BUILDINGS) as WorldBuildingType[]).map(type => (
            <DraggableBuildItem
              key={type}
              type={type}
              available={availablePower >= WORLD_BUILDINGS[type].cost}
              selected={selectedType === type}
              onSelect={() => {
                setSelectedType(type);
                setMessage(`${WORLD_BUILDINGS[type].name}: tap or drag to a glowing plot`);
              }}
              onDrop={drop}
            />
          ))}
        </ScrollView>
        {world.spentPower === 0 && <Text style={styles.starterNote}>🎁 {STARTER_BUILD_POWER.toLocaleString()} starter power included</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FCFF' },
  content: { paddingHorizontal: 16, paddingBottom: 26, alignItems: 'center' },
  header: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 },
  eyebrow: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#53657D', marginBottom: -3 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, color: '#081A4B' },
  powerValue: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3D6', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  powerText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#7C5600' },
  dailyRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 4, marginBottom: 12 },
  dailyLabel: { fontFamily: 'Nunito_700Bold', color: '#53657D', fontSize: 12 },
  dailyAmount: { fontFamily: 'Nunito_800ExtraBold', color: '#3270EB', fontSize: 12, minWidth: 68, textAlign: 'right' },
  progressTrack: { flex: 1, height: 9, backgroundColor: '#DDE8F3', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#B8F23D', borderRadius: 99 },
  canvas: { width: '100%', maxWidth: 600, aspectRatio: MAP_WIDTH / MAP_HEIGHT, borderRadius: 30, overflow: 'hidden', backgroundColor: '#B9ECFF', shadowColor: '#3270EB', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  plotTouch: { position: 'absolute', width: '21%', height: '17%', borderRadius: 50 },
  worldHero: { position: 'absolute', left: 0, top: 0, width: 48, height: 72 },
  heroImage: { width: 48, height: 72 },
  instructionRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 42 },
  instruction: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#53657D', textAlign: 'center' },
  upgradeRow: { width: '100%', maxWidth: 600, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#3270EB', borderRadius: 19, paddingHorizontal: 15, paddingVertical: 11, marginBottom: 14 },
  upgradeDisabled: { backgroundColor: '#7B8A9E' },
  upgradeIcon: { fontSize: 29 },
  upgradeTitle: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 15 },
  upgradeMeta: { fontFamily: 'Nunito_600SemiBold', color: '#E8F0FF', fontSize: 12 },
  sectionTitle: { width: '100%', maxWidth: 600, fontFamily: 'Nunito_800ExtraBold', color: '#081A4B', fontSize: 18, marginHorizontal: 4, marginBottom: 7 },
  trayScroll: { width: '100%', maxWidth: 600, flexGrow: 0 },
  buildTray: { gap: 10, paddingHorizontal: 2, paddingTop: 5, paddingBottom: 10 },
  buildItem: { width: 86, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D9E2EF', shadowColor: '#081A4B', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, zIndex: 1 },
  buildItemSelected: { borderColor: '#3270EB', backgroundColor: '#EDF4FF' },
  buildItemDisabled: { opacity: 0.42 },
  buildItemDragging: { zIndex: 100, elevation: 12, shadowOpacity: 0.25, transform: [{ scale: 1.08 }] },
  buildItemPressable: { alignItems: 'center', paddingVertical: 9, paddingHorizontal: 5 },
  buildEmoji: { fontSize: 31, lineHeight: 38 },
  buildName: { fontFamily: 'Nunito_800ExtraBold', color: '#081A4B', fontSize: 12 },
  buildCost: { fontFamily: 'Nunito_700Bold', color: '#53657D', fontSize: 10, marginTop: 2 },
  starterNote: { width: '100%', maxWidth: 600, fontFamily: 'Nunito_600SemiBold', color: '#53657D', fontSize: 12, textAlign: 'center', marginTop: 1 },
});
