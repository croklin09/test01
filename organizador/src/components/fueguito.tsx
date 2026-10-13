import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { BUNDLED_ANIMATIONS } from '../lib/fueguitoBundled';
import { getFueguitoImages, getFueguitoMedia, pickFueguitoMedia, type FueguitoMedia } from '../lib/fueguitoMedia';
import { Moon, Sun } from './illustrations';

// Fueguito: personaje propio (llama con ojos grandes sobre troncos), inspirado en los espíritus de fuego del
// cine de animación. Todas las animaciones usan transform/opacity con el driver nativo.

const VB_W = 120;
const VB_H = 140;

const OUTER =
  'M60 4 C64 22 74 26 76 40 C80 30 86 26 88 16 C94 36 104 52 104 78 C104 106 86 122 60 122 C34 122 16 106 16 78 C16 58 26 44 32 32 C35 40 38 45 42 48 C40 32 50 20 60 4 Z';
const MIDDLE =
  'M60 22 C64 38 72 42 74 54 C78 48 82 44 84 36 C90 52 96 64 96 84 C96 106 80 117 60 117 C40 117 24 106 24 84 C24 68 32 58 38 50 C40 56 43 60 46 62 C46 48 53 36 60 22 Z';
const INNER = 'M60 46 C66 60 84 68 84 90 C84 106 74 113 60 113 C46 113 36 106 36 90 C37 72 54 62 60 46 Z';
const SPARK = 'M6 0 C9 5 10 9 6 13 C2 9 3 5 6 0 Z';

/** Bucle de "titileo": valores que se alternan con duraciones distintas para que no se vea mecánico. */
function useFlicker(steps: number[], durations: number[]) {
  const [v] = useState(() => new Animated.Value(steps[0]));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence(
        steps.map((toValue, i) =>
          Animated.timing(v, {
            toValue,
            duration: durations[i % durations.length],
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ),
      ),
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return v;
}

function Spark({ delay, x, size }: { delay: number; x: number; size: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v, delay]);
  const s = size / VB_H;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x * s,
        top: 20 * s,
        opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -40 * s] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 5 * s, -3 * s] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) },
        ],
      }}
    >
      <Svg width={12 * s} height={14 * s} viewBox="0 0 12 14">
        <Path d={SPARK} fill="#FFB43A" />
      </Svg>
    </Animated.View>
  );
}

export function Fueguito({ size = 140 }: { size?: number }) {
  const width = (size * VB_W) / VB_H;
  const outer = useFlicker([1, 1.07, 0.97, 1.04, 1], [260, 320, 280, 340]);
  const middle = useFlicker([0, 1, -1, 0.5, 0], [300, 260, 340, 280]);
  const inner = useFlicker([1, 0.92, 1.05, 0.96, 1], [220, 300, 260, 240]);
  const bob = useFlicker([0, 1, 0], [900, 900]);

  // Parpadeo cada ~3 s
  const [blink] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(blink, { toValue: 0.1, duration: 80, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [blink]);

  const layer = StyleSheet.absoluteFill;
  const svg = (children: React.ReactNode) => (
    <Svg width={width} height={size} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {children}
    </Svg>
  );
  const faceY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, (-3 * size) / VB_H] });

  return (
    <View style={{ width, height: size }} accessibilityLabel="Fueguito">
      {/* Troncos */}
      <View style={layer}>
        {svg(
          <G>
            <Rect x={12} y={116} width={96} height={13} rx={6.5} fill="#8A5528" rotation={-9} origin="60, 122" />
            <Rect x={12} y={116} width={96} height={13} rx={6.5} fill="#A0652F" rotation={9} origin="60, 122" />
            <Circle cx={104} cy={128} r={6} fill="#D7A46D" />
            <Circle cx={104} cy={128} r={3} fill="#B9844F" />
            <Circle cx={16} cy={128} r={6} fill="#D7A46D" />
            <Circle cx={16} cy={128} r={3} fill="#B9844F" />
          </G>,
        )}
      </View>
      {/* Capas de llama, cada una con su ritmo; escalan desde la base */}
      <Animated.View
        style={[layer, { transformOrigin: 'bottom', transform: [{ scaleY: outer }, { scaleX: Animated.divide(1, outer) }] }]}
      >
        {svg(<Path d={OUTER} fill="#F2541B" />)}
      </Animated.View>
      <Animated.View
        style={[
          layer,
          {
            transformOrigin: 'bottom',
            transform: [
              { skewX: middle.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] }) },
              { scaleY: middle.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.97, 1, 1.05] }) },
            ],
          },
        ]}
      >
        {svg(<Path d={MIDDLE} fill="#FF8A1F" />)}
      </Animated.View>
      <Animated.View style={[layer, { transformOrigin: 'bottom', transform: [{ scaleY: inner }] }]}>
        {svg(<Path d={INNER} fill="#FFD23F" />)}
      </Animated.View>
      {/* Cara: flota apenas, y los ojos parpadean */}
      <Animated.View style={[layer, { transform: [{ translateY: faceY }] }]}>
        {svg(<Path d="M53 99 Q60 105 67 99" stroke="#3A2414" strokeWidth={2.6} strokeLinecap="round" fill="none" />)}
      </Animated.View>
      <Animated.View
        style={[layer, { transformOrigin: '50% 59%', transform: [{ translateY: faceY }, { scaleY: blink }] }]}
      >
        {svg(
          <G>
            <Circle cx={46} cy={82} r={10} fill="#FFFFFF" stroke="#3A2414" strokeWidth={1.6} />
            <Circle cx={74} cy={82} r={10} fill="#FFFFFF" stroke="#3A2414" strokeWidth={1.6} />
            <Circle cx={47} cy={83} r={3.4} fill="#1F140C" />
            <Circle cx={73} cy={83} r={3.4} fill="#1F140C" />
          </G>,
        )}
      </Animated.View>
      <Spark delay={0} x={30} size={size} />
      <Spark delay={500} x={80} size={size} />
      <Spark delay={950} x={56} size={size} />
    </View>
  );
}

/**
 * Marco para las animaciones elegidas: titila y "respira" suave, así una imagen quieta no se ve congelada y un
 * GIF animado apenas cambia. Brillo cálido alrededor como si iluminara el encabezado.
 */
function Breathing({ size, children }: { size: number; children: React.ReactNode }) {
  const breath = useFlicker([1, 1.035, 0.99, 1.025, 1], [700, 600, 650, 550]);
  const glow = useFlicker([0.55, 0.85, 0.6, 0.8, 0.55], [420, 380, 460, 400]);
  return (
    <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: breath }] }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { margin: -10, borderRadius: 34, backgroundColor: '#FF8A1F', opacity: glow },
        ]}
      />
      <View style={{ borderRadius: 24, overflow: 'hidden', width: size * 1.25, height: size }}>{children}</View>
    </Animated.View>
  );
}

export const isNight = (d = new Date()) => d.getHours() >= 20 || d.getHours() < 7;

/**
 * Sol o luna (según la hora) que, al tocarlo, se transforma en el fueguito y reproduce el audio elegido.
 * Vuelve a ser sol/luna cuando el audio termina o al tocarlo de nuevo.
 */
export function SunMoonFueguito({ size = 112, night }: { size?: number; night: boolean }) {
  const db = useSQLiteContext();
  const [playing, setPlaying] = useState(false);
  const [showFire, setShowFire] = useState(false); // sigue montado mientras se apaga
  const [gif, setGif] = useState<number | { uri: string } | null>(null); // animación elegida al azar (si hay)
  const [p] = useState(() => new Animated.Value(0));
  const player = useRef<AudioPlayer | null>(null);

  useEffect(() => () => player.current?.remove(), []);

  function stop() {
    player.current?.remove();
    player.current = null;
    setPlaying(false);
    Animated.timing(p, { toValue: 0, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(
      ({ finished }) => finished && setShowFire(false),
    );
  }

  async function play(audio: FueguitoMedia) {
    // Una animación al azar entre las incluidas y las elegidas por la persona; si no hay, el fueguito dibujado.
    const pool = [
      ...BUNDLED_ANIMATIONS.map((b) => b.source),
      ...(await getFueguitoImages(db)).map((m) => ({ uri: m.uri })),
    ];
    setGif(pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    const pl = createAudioPlayer({ uri: audio.uri });
    pl.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) stop();
    });
    pl.play();
    player.current = pl;
    setPlaying(true);
    setShowFire(true);
    Animated.spring(p, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  }

  async function start() {
    const audio = await getFueguitoMedia(db, 'audio');
    if (audio) return play(audio);
    Alert.alert('Despertá al fueguito', 'Elegí una canción de tu teléfono para que suene cuando lo toques.', [
      { text: 'Ahora no', style: 'cancel' },
      {
        text: 'Elegir audio',
        onPress: () =>
          pickFueguitoMedia(db, 'audio')
            .then((a) => a && play(a))
            .catch((e) => Alert.alert('No se pudo usar ese audio', e instanceof Error ? e.message : String(e))),
      },
    ]);
  }

  const fire = size * 1.15;
  return (
    <Pressable
      onPress={() => (playing ? stop() : start())}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Apagar el fueguito' : night ? 'Luna: tocá para despertar al fueguito' : 'Sol: tocá para despertar al fueguito'}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          opacity: p.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
          transform: [
            { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
            { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '120deg'] }) },
          ],
        }}
      >
        {night ? <Moon size={size} /> : <Sun size={size} />}
      </Animated.View>
      {showFire && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: -size * 0.08,
            opacity: p.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          }}
        >
          {gif ? (
            <Breathing size={fire}>
              <Image source={gif} autoplay contentFit="cover" style={{ width: fire * 1.25, height: fire }} />
            </Breathing>
          ) : (
            <Fueguito size={fire} />
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}
