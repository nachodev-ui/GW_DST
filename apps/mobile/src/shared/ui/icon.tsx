import { Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { theme } from '@/theme';

const paths = {
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6',
  flame: 'M12 2c1 6 7 7 7 13a7 7 0 0 1-14 0c0-3 2-6 4-8 0 4 1 5 2 6 2-3 2-6 1-11Z',
  phone: 'M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z',
  sort: 'M3 6h14M3 12h9M3 18h4M19 11v10m-3-3 3 3 3-3',
  calendar: 'M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2',
  chat: 'M21 11a9 8 0 0 1-9 8H7l-5 3 2-6a8 8 0 0 1-1-5 9 8 0 0 1 18 0ZM8 11h.01M12 11h.01M16 11h.01',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14ZM4 14l5 5',
  chevronDown: 'm6 9 6 6 6-6',
  dashboard: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  chart: 'M3 3v18h18M7 16v-5M12 16V7M17 16V4',
  store: 'M3 9h18l-2-6H5ZM4 9v12h16V9M9 21v-7h6v7M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0',
  image: 'M3 3h18v18H3ZM3 16l6-6 5 5 3-3 4 4M15 7h.01',
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
  pickup:
    'M2 10h9V6h5l4 5h2v6h-2M8 17h8M2 10v7h2M11 10h9M4 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M16 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  van: 'M2 17V7a2 2 0 0 1 2-2h12l6 7v5h-2M8 17h8M2 17h2M13 5v7h9M4 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M16 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  close: 'm6 6 12 12M6 18 18 6',
  cash: 'M2 5h20v14H2ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  mail: 'M3 5h18v14H3ZM3 5l9 8 9-8',
  logout: 'M9 4H3v16h6M9 12h12m-5-5 5 5-5 5',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  exchange: 'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
  refresh: 'M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 14-2l1 2M4 17l1 2a8 8 0 0 0 14-2',
  navigate: 'm3 10 18-7-7 18-3-8-8-3Zm8 3L21 3',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  locate:
    'M12 2v3m0 14v3M2 12h3m14 0h3M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  info: 'M12 11v6m0-10v.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  pause: 'M9 5v14M15 5v14',
} as const;
export type IconName = keyof typeof paths;

const filledPaths: Partial<Record<IconName, string>> = {
  home: 'M2 10 12 2l10 8-2 2-1-1v11h-5v-8h-4v8H5V11l-1 1Z',
  orders: 'M8 2h8v5H8ZM4 4h3v4h10V4h3v18H4Zm3 7v2h10v-2Zm0 5v2h8v-2Z',
  user: 'M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM3 22v-2a9 7 0 0 1 18 0v2Z',
};

export function Icon({
  name,
  color = theme.colors.primary,
  size = theme.layout.icon,
  filled = false,
}: {
  name: IconName;
  color?: string;
  size?: number;
  filled?: boolean;
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
      {...(Platform.OS === 'web' ? {} : { accessible: false })}
      aria-hidden
    >
      {name === 'clock' ? <Circle cx="12" cy="12" r="9" /> : null}
      {filled && filledPaths[name] ? (
        <Path d={filledPaths[name]} fill={color} fillRule="evenodd" stroke="none" />
      ) : (
        <Path d={paths[name]} />
      )}
    </Svg>
  );
}
