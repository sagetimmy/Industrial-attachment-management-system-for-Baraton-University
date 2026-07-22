import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';


const NATIVE_DRIVER = Platform.OS !== 'web';
export function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonLines({ count = 3, lineHeight = 12, gap = 8, lastLineWidth = '60%' }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === count - 1 ? lastLineWidth : '100%'}
          style={{ marginBottom: i === count - 1 ? 0 : gap }}
        />
      ))}
    </View>
  );
}

export function SkeletonCircle({ size = 48 }) {
  return <Skeleton width={size} height={size} radius={size / 2} />;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#E1E4E8',
  },
});