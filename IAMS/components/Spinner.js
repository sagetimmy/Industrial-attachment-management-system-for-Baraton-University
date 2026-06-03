import { ActivityIndicator, Platform, View } from 'react-native';
import { BeatLoader } from 'react-spinners';

const resolveBeatSize = (size) => {
  if (typeof size === 'number') return size;
  return size === 'large' ? 16 : 10;
};

const resolveNativeSize = (size) => {
  if (typeof size === 'number') return size >= 14 ? 'large' : 'small';
  return size || 'small';
};

export default function Spinner({
  size = 'small',
  color = '#C87941',
  loading = true,
  style,
}) {
  if (!loading) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={style}>
        <BeatLoader size={resolveBeatSize(size)} color={color} loading={loading} />
      </View>
    );
  }

  return <ActivityIndicator size={resolveNativeSize(size)} color={color} style={style} />;
}
