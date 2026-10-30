import { Animated, Keyboard, PanResponder, Platform } from 'react-native';
import { theme } from '@/theme';

type SheetState = {
  visible: boolean;
  dismissible: boolean;
  saving: boolean;
  reducedMotion: boolean;
  onClose: () => void;
};

// Imperative native callbacks stay outside React render and use the latest committed state.
export class BottomSheetMotion {
  readonly translateY = new Animated.Value(0);
  readonly panHandlers;
  private height = 0;
  private dragStart = 0;
  private closing = false;
  private revision = 0;
  private dragRevision = -1;
  private current: SheetState = {
    visible: false,
    dismissible: true,
    saving: false,
    reducedMotion: false,
    onClose() {},
  };

  constructor() {
    this.panHandlers = PanResponder.create({
      // Modal claims otherwise-unhandled starts. Own header touches immediately;
      // waiting for a bubbling move can leave the Modal as responder instead.
      // Do not capture starts: the close button must keep its normal tap behavior.
      onStartShouldSetPanResponder: () => this.canDismiss(),
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        this.canDismiss() &&
        gesture.dy > theme.bottomSheet.dragActivation &&
        gesture.dy > Math.abs(gesture.dx) * theme.bottomSheet.verticalIntentRatio,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        this.canDismiss() &&
        gesture.dy > theme.bottomSheet.dragActivation &&
        gesture.dy > Math.abs(gesture.dx) * theme.bottomSheet.verticalIntentRatio,
      onPanResponderGrant: () => {
        this.dragRevision = this.revision;
        this.translateY.stopAnimation((value) => {
          this.dragStart = value;
        });
        Keyboard.dismiss();
      },
      onPanResponderMove: (_event, gesture) => {
        if (this.canDismiss() && this.dragRevision === this.revision)
          this.translateY.setValue(Math.max(0, this.dragStart + gesture.dy));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (!this.canDismiss() || this.dragRevision !== this.revision) return;
        const distance = Math.max(
          theme.bottomSheet.minDismissDistance,
          Math.min(
            theme.bottomSheet.dismissDistance,
            this.height * theme.bottomSheet.dismissHeightRatio,
          ),
        );
        const shouldClose =
          gesture.dy > Math.abs(gesture.dx) &&
          (gesture.dy >= distance ||
            (gesture.dy >= theme.bottomSheet.minFlingDistance &&
              gesture.vy >= theme.bottomSheet.dismissVelocity));
        if (!shouldClose) {
          this.restore();
          return;
        }
        this.closing = true;
        const releasedAt = this.revision;
        Animated.timing(this.translateY, {
          toValue: Math.max(this.height, theme.layout.touchTarget) + theme.spacing.screen,
          duration: this.current.reducedMotion ? 0 : theme.motion.transition,
          useNativeDriver: Platform.OS !== 'web',
        }).start(({ finished }) => {
          if (
            finished &&
            releasedAt === this.revision &&
            this.current.visible &&
            this.current.dismissible &&
            !this.current.saving
          )
            this.current.onClose();
        });
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        if (this.canDismiss()) this.restore();
      },
    }).panHandlers;
  }

  update(next: SheetState) {
    const reset =
      next.visible !== this.current.visible ||
      next.dismissible !== this.current.dismissible ||
      next.saving !== this.current.saving;
    this.current = next;
    if (reset) {
      this.revision += 1;
      this.translateY.stopAnimation();
      if (next.visible) {
        this.translateY.setValue(0);
        this.closing = false;
      }
    }
  }

  measure(height: number) {
    this.height = height;
  }

  dismiss = () => {
    if (this.canDismiss()) {
      this.closing = true;
      this.translateY.stopAnimation();
      this.current.onClose();
    }
  };

  dispose() {
    this.revision += 1;
    this.current = { ...this.current, visible: false };
    this.translateY.stopAnimation();
  }

  private canDismiss() {
    return (
      this.current.visible && this.current.dismissible && !this.current.saving && !this.closing
    );
  }

  private restore() {
    Animated.timing(this.translateY, {
      toValue: 0,
      duration: this.current.reducedMotion ? 0 : theme.motion.pressDuration,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }
}
