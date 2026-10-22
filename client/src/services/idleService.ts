// services/idleService.ts — Quản lý phiên làm việc & Tự động đăng xuất sau 15 phút không hoạt động

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 phút
export const WARNING_DURATION_SEC = 60; // Cảnh báo trước 60 giây
export const WARNING_THRESHOLD_MS = IDLE_TIMEOUT_MS - WARNING_DURATION_SEC * 1000; // 14 phút

export type IdleState = {
  isWarning: boolean;
  remainingSeconds: number;
};

type IdleListener = (state: IdleState) => void;

class IdleService {
  private lastActive: number = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;
  private isWarning: boolean = false;
  private remainingSeconds: number = WARNING_DURATION_SEC;
  private pausedReasons: Set<string> = new Set();
  private listeners: Set<IdleListener> = new Set();
  private onTimeoutCallback: (() => void) | null = null;
  private isRunning: boolean = false;
  private lastThrottledActivity: number = 0;

  constructor() {
    this.handleActivity = this.handleActivity.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.tick = this.tick.bind(this);
  }

  /**
   * Khởi tạo và liên kết callback đăng xuất khi hết thời gian chờ
   */
  public init(onTimeout: () => void) {
    this.onTimeoutCallback = onTimeout;
  }

  /**
   * Bắt đầu theo dõi hoạt động người dùng khi đăng nhập
   */
  public start() {
    this.lastActive = Date.now();
    this.isWarning = false;
    this.remainingSeconds = WARNING_DURATION_SEC;
    this.isRunning = true;

    if (typeof window !== "undefined") {
      const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
      events.forEach((ev) =>
        window.addEventListener(ev, this.handleActivity, { passive: true })
      );
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(this.tick, 1000);
    this.notify();
  }

  /**
   * Dừng bộ đếm khi đăng xuất hoặc hết hạn
   */
  public stop() {
    this.isRunning = false;
    this.isWarning = false;
    this.remainingSeconds = WARNING_DURATION_SEC;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (typeof window !== "undefined") {
      const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
      events.forEach((ev) =>
        window.removeEventListener(ev, this.handleActivity)
      );
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }

    this.notify();
  }

  /**
   * Reset bộ đếm khi người dùng bấm nút "Tiếp tục" trong modal cảnh báo
   */
  public resetTimer() {
    this.lastActive = Date.now();
    this.isWarning = false;
    this.remainingSeconds = WARNING_DURATION_SEC;
    this.notify();
  }

  /**
   * Tạm dừng bộ đếm khi đang trong phòng học hoặc làm bài kiểm tra
   */
  public setPaused(reason: "classroom" | "test", paused: boolean) {
    if (paused) {
      this.pausedReasons.add(reason);
      this.lastActive = Date.now();
      if (this.isWarning) {
        this.isWarning = false;
        this.remainingSeconds = WARNING_DURATION_SEC;
      }
    } else {
      this.pausedReasons.delete(reason);
      this.lastActive = Date.now();
    }
    this.notify();
  }

  public isPaused(): boolean {
    return this.pausedReasons.size > 0;
  }

  public subscribe(listener: IdleListener): () => void {
    this.listeners.add(listener);
    listener({
      isWarning: this.isWarning,
      remainingSeconds: this.remainingSeconds,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state: IdleState = {
      isWarning: this.isWarning,
      remainingSeconds: this.remainingSeconds,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  private handleActivity() {
    // Nếu modal cảnh báo đang hiện, bắt buộc người dùng bấm nút "Tiếp tục" để xác nhận
    if (this.isWarning) return;

    // Giới hạn tần suất xử lý (throttle 1 giây)
    const now = Date.now();
    if (now - this.lastThrottledActivity < 1000) return;
    this.lastThrottledActivity = now;

    if (!this.isPaused()) {
      this.lastActive = now;
    }
  }

  private handleVisibilityChange() {
    if (!this.isRunning || this.isPaused()) return;

    // Khi tab trình duyệt được hiển thị lại, kiểm tra ngay độ chênh lệch thời gian
    if (document.visibilityState === "visible") {
      const elapsed = Date.now() - this.lastActive;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        this.triggerTimeout();
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        this.isWarning = true;
        this.remainingSeconds = Math.max(1, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        this.notify();
      } else {
        this.isWarning = false;
        this.notify();
      }
    }
  }

  private tick() {
    if (!this.isRunning) return;

    // Khi đang trong phòng học hoặc thi: liên tục giữ lastActive để không tính idle
    if (this.isPaused()) {
      this.lastActive = Date.now();
      if (this.isWarning) {
        this.isWarning = false;
        this.remainingSeconds = WARNING_DURATION_SEC;
        this.notify();
      }
      return;
    }

    const elapsed = Date.now() - this.lastActive;

    if (elapsed >= IDLE_TIMEOUT_MS) {
      this.triggerTimeout();
    } else if (elapsed >= WARNING_THRESHOLD_MS) {
      const remaining = Math.max(1, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
      this.isWarning = true;
      this.remainingSeconds = remaining;
      this.notify();
    } else {
      if (this.isWarning) {
        this.isWarning = false;
        this.remainingSeconds = WARNING_DURATION_SEC;
        this.notify();
      }
    }
  }

  private triggerTimeout() {
    this.stop();
    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    }
  }
}

export const idleService = new IdleService();
