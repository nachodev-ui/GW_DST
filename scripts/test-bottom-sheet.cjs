// Exercise real component callbacks through mocked native boundaries; no UI rendering.
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { Module, createRequire } = require('node:module');
const { transformFileSync } = require('@babel/core');
const { load } = require('./testing/load.cjs');

// Use RN's installed responder adapter and touch-history math, not a callback stub.
function actualPanResponder() {
  const root = path.dirname(require.resolve('react-native/package.json'));
  const flowModule = (relative, mocks = {}) => {
    const filename = path.join(root, 'Libraries/Interaction', relative);
    const { code } = transformFileSync(filename, {
      configFile: false,
      babelrc: false,
      presets: [require.resolve('@react-native/babel-preset')],
    });
    const module = new Module(filename);
    const fallback = createRequire(filename);
    module.require = (name) => (Object.hasOwn(mocks, name) ? mocks[name] : fallback(name));
    module._compile(code, filename);
    return module.exports;
  };
  const math = flowModule('TouchHistoryMath.js');
  return flowModule('PanResponder.js', { './TouchHistoryMath': math }).default;
}

const nodes = (value) =>
  !value || typeof value !== 'object'
    ? []
    : Array.isArray(value)
      ? value.flatMap(nodes)
      : [value, ...nodes(value.props?.children)];
function harness(initial = {}, responder) {
  const states = [],
    effects = [],
    pendingEffects = [],
    animations = [];
  let stateCursor = 0,
    effectCursor = 0,
    gestures,
    closes = 0;
  let props = {
    visible: true,
    title: 'Detalle',
    onClose: () => {
      closes += 1;
    },
    ...initial,
  };
  const native = {
    View: 'View',
    Modal: 'Modal',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Pressable: 'Backdrop',
    Keyboard: { dismiss() {} },
    Platform: { OS: 'android', select: (options) => options.default },
    StyleSheet: { create: (value) => value, absoluteFill: {} },
    PanResponder: responder ?? {
      create: (callbacks) => {
        gestures = callbacks;
        return { panHandlers: { dragSurface: true } };
      },
    },
    Animated: {
      createAnimatedComponent: () => 'AnimatedSheet',
      Value: class {
        value = 0;
        setValue(value) {
          this.value = value;
        }
        stopAnimation(callback) {
          if (this.animation) {
            this.animation.callback?.({ finished: false });
            this.animation = undefined;
          }
          callback?.(this.value);
        }
      },
      timing: (value, options) => ({
        start(callback) {
          const animation = { value, options, callback };
          value.animation = animation;
          animations.push(animation);
        },
      }),
    },
  };
  const theme = load('apps/mobile/src/theme/index.ts', { 'react-native': native }).theme;
  const { BottomSheet } = load('apps/mobile/src/shared/ui/bottom-sheet.tsx', {
    react: {
      useState: (initial) => {
        const index = stateCursor++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], () => {}];
      },
      useLayoutEffect: (create, dependencies) => {
        const index = effectCursor++;
        const previous = effects[index];
        if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i]))
          pendingEffects.push(() => {
            previous?.cleanup?.();
            effects[index] = { dependencies, cleanup: create() };
          });
      },
    },
    'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-native-reanimated': { useReducedMotion: () => initial.reducedMotion ?? false },
    '@/theme': { theme },
    './components': { Button: 'Button' },
    './icon': { Icon: 'Icon' },
    './pulse-pressable': { PulsePressable: 'Close' },
    './text': { Text: 'Text' },
  });
  let tree;
  const render = (changes = {}) => {
    props = { ...props, ...changes };
    stateCursor = 0;
    effectCursor = 0;
    tree = BottomSheet(props);
    pendingEffects.splice(0).forEach((effect) => effect());
    return tree;
  };
  render();
  const find = (type) => nodes(tree).find((node) => node.type === type);
  find('AnimatedSheet').props.onLayout({ nativeEvent: { layout: { height: 400 } } });
  const finish = (animation = animations.at(-1)) => {
    animation.value.animation = undefined;
    animation.value.value = animation.options.toValue;
    animation.callback?.({ finished: true });
  };
  const swipe = (dy, vy = 0, dx = 0) => {
    const gesture = { dx, dy, vy };
    if (!gestures.onMoveShouldSetPanResponder(null, gesture)) return false;
    gestures.onPanResponderGrant();
    gestures.onPanResponderMove(null, gesture);
    gestures.onPanResponderRelease(null, gesture);
    return true;
  };
  return {
    render,
    find,
    swipe,
    finish,
    animations,
    header: () => nodes(tree).find((node) => node.props?.onStartShouldSetResponder)?.props,
    get gestures() {
      return gestures;
    },
    get closes() {
      return closes;
    },
    unmount() {
      effects.forEach((effect) => effect.cleanup?.());
    },
  };
}

test('real RN responder owns header touches before Modal and delivers move/release; X keeps taps', () => {
  const h = harness({}, actualPanResponder());
  const header = h.header();
  assert.equal(header.collapsable, false, 'the drag surface stays a native host view');
  const touch = {
    touchActive: true,
    startPageX: 100,
    startPageY: 100,
    startTimeStamp: 1,
    previousPageX: 100,
    previousPageY: 100,
    previousTimeStamp: 1,
    currentPageX: 100,
    currentPageY: 100,
    currentTimeStamp: 1,
  };
  const touchHistory = {
    touchBank: [touch],
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: 1,
  };
  const event = { nativeEvent: { touches: [{}] }, touchHistory };
  assert.equal(
    header.onStartShouldSetResponderCapture(event),
    false,
    'X taps are not captured by the header',
  );
  assert.equal(
    header.onStartShouldSetResponder(event),
    true,
    'header owns the initial touch before Modal claims it',
  );
  header.onResponderGrant(event);
  touch.currentPageY = 220;
  touch.currentTimeStamp = 161;
  touchHistory.mostRecentTimeStamp = 161;
  header.onResponderMove(event);
  const animatedY = h.find('AnimatedSheet').props.style[1].transform[0].translateY;
  assert.equal(animatedY.value, 120, 'actual responder touch history moves the sheet');
  header.onResponderRelease(event);
  h.finish();
  assert.equal(h.closes, 1);
});

test('header start ownership and capture stay blocked while saving', () => {
  const h = harness({ saving: true }, actualPanResponder());
  const header = h.header();
  assert.equal(header.onStartShouldSetResponder({}), false);
});

test('all sheets expose an accessible X, including custom headers and save forms', () => {
  const h = harness({ onSave() {}, header: { type: 'CustomHeader', props: {} } });
  assert.equal(h.find('CustomHeader').type, 'CustomHeader');
  assert.equal(h.find('Close').props.accessibilityLabel, 'Cerrar ventana');
  assert.equal(h.find('Icon').props.name, 'close');
  assert.equal(
    nodes(h.render()).some((node) => node.type === 'Button' && node.props.label === 'Cerrar'),
    false,
  );
  h.find('Close').props.onPress();
  h.find('Modal').props.onRequestClose();
  assert.equal(h.closes, 1, 'dismiss fires only once for the same opening');
});

test('drag follows the finger, snaps back when short and dismisses after downward distance/fling', () => {
  const h = harness();
  assert.equal(
    h.find('AnimatedSheet').props.dragSurface,
    undefined,
    'content scroll/map gestures are not intercepted',
  );
  assert.equal(h.swipe(-120), false);
  assert.equal(h.swipe(20, 0, 80), false);
  h.swipe(30);
  assert.equal(h.animations.at(-1).value.value, 30);
  assert.equal(h.animations.at(-1).options.toValue, 0);
  h.finish();
  assert.equal(h.closes, 0);
  h.swipe(110);
  assert.equal(h.closes, 0, 'close waits for the departure animation');
  h.finish();
  assert.equal(h.closes, 1);
  h.render({ visible: false });
  h.render({ visible: true });
  h.swipe(28, 1);
  h.finish();
  assert.equal(h.closes, 2, 'a deliberate downward fling also dismisses');
});

test('saving/non-dismissible sheets block X, backdrop, back, escape and gestures, including stale callbacks', () => {
  for (const lock of [{ saving: true }, { dismissible: false }]) {
    const h = harness();
    const oldClose = h.find('Close').props.onPress;
    h.render(lock);
    assert.equal(h.find('Close').props.disabled, true);
    oldClose();
    h.find('Backdrop').props.onPress();
    h.find('Modal').props.onRequestClose();
    h.find('AnimatedSheet').props.onAccessibilityEscape();
    assert.equal(h.swipe(140, 1), false);
    assert.equal(h.closes, 0);
  }
  const h = harness();
  h.swipe(110);
  const late = h.animations.at(-1);
  h.render({ saving: true });
  late.callback({ finished: true });
  assert.equal(h.closes, 0, 'saving that starts during the departure cancels dismissal');
});

test('reopening/unmount invalidate old gestures and callbacks; reduced motion skips timed movement', () => {
  const h = harness({ reducedMotion: true });
  h.swipe(110);
  const old = h.animations.at(-1);
  assert.equal(old.options.duration, 0);
  h.render({ visible: false });
  h.render({ visible: true });
  assert.equal(old.value.value, 0, 'a new opening starts in its resting position');
  old.callback({ finished: true });
  assert.equal(h.closes, 0);
  h.swipe(110);
  const afterUnmount = h.animations.at(-1);
  h.unmount();
  afterUnmount.callback({ finished: true });
  assert.equal(h.closes, 0);
});
