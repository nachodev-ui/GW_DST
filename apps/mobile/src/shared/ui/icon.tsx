import Svg, { Path, Circle } from 'react-native-svg';
import { theme } from '@/theme';

const paths = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  orders: 'M7 4H5v17h14V4h-2M9 3h6v4H9ZM8 12h8M8 16h6',
  user: 'M4 21v-2a8 8 0 0 1 16 0v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  arrowLeft: 'M20 12H4m7-7-7 7 7 7',
  arrowRight: 'M4 12h16m-7-7 7 7-7 7',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 7v5l3 2',
  truck:
    'M2 4h12v13H2ZM14 8h4l4 5v4h-8M4 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M16 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  close: 'm6 6 12 12M6 18 18 6',
  cash: 'M2 5h20v14H2ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  mail: 'M3 5h18v14H3ZM3 5l9 8 9-8',
  logout: 'M9 4H3v16h6M9 12h12m-5-5 5 5-5 5',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  exchange: 'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
  refresh: 'M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 14-2l1 2M4 17l1 2a8 8 0 0 0 14-2',
} as const;
export type IconName = keyof typeof paths;

export function Icon({
  name,
  color = theme.colors.primary,
  size = theme.layout.icon,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      aria-hidden
    >
      {name === 'clock' ? <Circle cx="12" cy="12" r="9" /> : null}
      <Path d={paths[name]} />
    </Svg>
  );
}
