// Evaluate source with boundary mocks only. No native views, renderer or network.
const assert = require('node:assert/strict');
require('./testing/offline.cjs');
const { load } = require('./testing/load.cjs');

function hooks() {
  let cells = [];
  let index = 0;
  let effects = [];
  const react = {
    useState: (initial) => {
      const position = index++;
      if (!(position in cells)) cells[position] = initial;
      return [
        cells[position],
        (value) => {
          cells[position] = typeof value === 'function' ? value(cells[position]) : value;
        },
      ];
    },
    useEffect: (effect) => effects.push(effect),
  };
  return {
    react,
    render(fn, props) {
      index = 0;
      effects = [];
      const element = fn(props);
      return { element, effects: [...effects] };
    },
    reset() {
      cells = [];
    },
  };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}

function timers() {
  const pending = new Map();
  let next = 0;
  return {
    pending,
    globals: {
      setTimeout(callback, ms) {
        pending.set(++next, { callback, ms });
        return next;
      },
      clearTimeout(id) {
        pending.delete(id);
      },
    },
    fire(ms) {
      for (const [id, timer] of [...pending]) {
        if (timer.ms === ms) {
          pending.delete(id);
          timer.callback();
        }
      }
    },
  };
}

async function main() {
  const h = hooks();
  const time = timers();
  const mocks = {
    react: h.react,
    'react-native': {
      Platform: { OS: 'android', select: (values) => values.default },
      StyleSheet: { create: (styles) => styles },
      ScrollView: 'scroll',
      View: 'view',
      useColorScheme: () => 'dark',
    },
    'react-native-safe-area-context': { SafeAreaView: 'safe' },
    './gasway-logo': { GaswayLogo: 'gasway-logo' },
    './components': { Button: 'button' },
    './icon': { Icon: 'icon' },
    './text': { Text: 'text' },
  };
  const { theme } = load('apps/mobile/src/theme/index.ts', mocks);
  mocks['@/theme'] = { theme };
  const { LoadingScreen } = load(
    'apps/mobile/src/shared/ui/loading-screen.tsx',
    mocks,
    time.globals,
  );
  let retries = 0;
  const props = {
    state: 'waiting',
    title: 'Acceso',
    description: 'Sesión',
    status: 'Revisando sesión',
    onRetry: async () => {
      retries++;
    },
  };
  const wait = LoadingScreen(props);
  const initial = h.render(wait.type, wait.props);
  const cleanup = initial.effects[0]();
  const frame = initial.element.type;
  const before = frame(initial.element.props);
  assert.equal(find(before, (node) => node.type === 'gasway-logo').props.appearance, 'dark');
  assert.equal(
    find(before, (node) => node.type === 'text'),
    undefined,
    'Normal waits show only the logo',
  );
  const accessibleLogo = find(
    before,
    (node) => node.props?.accessibilityLabel === 'Gasway. ' + props.status,
  );
  assert.equal(accessibleLogo.props.accessibilityState.busy, true);
  assert.equal(accessibleLogo.props.accessibilityLiveRegion, 'polite');
  assert.equal(
    find(before, (node) => node.props?.label === 'Reintentar'),
    undefined,
  );
  assert.equal(retries, 0, 'A visual timer must never trigger an auth retry');
  time.fire(15_000);
  const afterWait = h.render(wait.type, wait.props).element;
  const after = frame(afterWait.props);
  assert.ok(find(after, (node) => node.type === 'gasway-logo'));
  assert.ok(find(after, (node) => node.props?.accessibilityLabel?.includes('tardando')));
  assert.equal(retries, 0);
  await find(after, (node) => node.props?.label === 'Reintentar').props.onPress();
  assert.equal(retries, 1);
  cleanup();
  assert.equal(time.pending.size, 0);

  const noRetry = frame({ ...afterWait.props, onRetry: undefined });
  assert.equal(
    find(noRetry, (node) => node.props?.label === 'Reintentar'),
    undefined,
  );
  assert.equal(LoadingScreen({ ...props, status: 'Verificando acceso' }).key, 'Verificando acceso');
  assert.notEqual(LoadingScreen({ ...props, state: 'success' }).type, wait.type);

  for (const state of ['success', 'notice', 'error', 'idle']) {
    const footer = { type: 'continue-button', props: { disabled: false } };
    const terminal = LoadingScreen({ ...props, state, footer, appearance: 'light' });
    const screen = terminal.type(terminal.props);
    assert.equal(find(screen, (node) => node.type === 'gasway-logo').props.appearance, 'light');
    assert.equal(
      find(screen, (node) => node.props?.accessibilityRole === 'header').props.children,
      props.title,
    );
    const status = find(screen, (node) => node.props?.accessibilityLabel === props.status);
    assert.equal(status.props.accessibilityRole, state === 'error' ? 'alert' : 'text');
    assert.equal(status.props.accessibilityState.busy, false);
    assert.equal(
      find(screen, (node) => node.type === 'continue-button'),
      footer,
    );
  }
  const pendingFooter = { type: 'continue-button', props: { disabled: true } };
  const pending = frame({ ...initial.element.props, footer: pendingFooter });
  assert.equal(find(pending, (node) => node.type === 'continue-button').props.disabled, true);
  assert.equal(
    find(pending, (node) => node.props?.label === 'Reintentar'),
    undefined,
  );

  // Verify text contrast for both local palettes without rendering the app.
  const luminance = (hex) => {
    const [r, g, b] = hex.match(/[0-9a-f]{2}/gi).map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  };
  for (const palette of [theme.loading.light, theme.loading.dark]) {
    for (const ink of [palette.text, palette.muted]) {
      for (const canvas of [palette.background, palette.surface]) {
        const a = luminance(ink);
        const b = luminance(canvas);
        assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5);
      }
    }
  }
  console.log(
    'PASS: logo-only wait, accessible status, bounded delay, explicit retry, terminal messages, confirmation controls and light/dark text contrast',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
