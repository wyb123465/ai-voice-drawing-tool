const RECOVERABLE_SPEECH_ERRORS = new Set(["no-speech", "aborted", "network"]);

export function isRecoverableSpeechError(error) {
  return RECOVERABLE_SPEECH_ERRORS.has(error);
}

export function createSpeechLoop({
  recognition,
  announceStatus,
  logEntry,
  showFallback,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  restartDelayMs = 350,
  maxRestartAttempts = 5
}) {
  let voiceModeRequested = false;
  let active = false;
  let restartTimer = null;
  let restartAttempts = 0;

  function clearRestartTimer() {
    if (restartTimer !== null) {
      clearTimeoutFn(restartTimer);
      restartTimer = null;
    }
  }

  function startRecognition() {
    try {
      recognition.start();
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.warn("启动语音识别失败:", error);
        return false;
      }
    }
    return true;
  }

  function scheduleRestart(reason) {
    if (!voiceModeRequested) {
      return;
    }
    if (restartTimer !== null) {
      return;
    }
    if (restartAttempts >= maxRestartAttempts) {
      voiceModeRequested = false;
      announceStatus("error", "语音异常");
      showFallback();
      logEntry(`语音识别连续重启失败：${reason}`);
      return;
    }

    restartAttempts += 1;
    announceStatus("listening", "重新连接中");
    restartTimer = setTimeoutFn(() => {
      restartTimer = null;
      if (voiceModeRequested) {
        startRecognition();
      }
    }, restartDelayMs);
  }

  function start() {
    voiceModeRequested = true;
    clearRestartTimer();
    startRecognition();
  }

  function stop() {
    voiceModeRequested = false;
    clearRestartTimer();
    if (active) {
      recognition.stop();
    }
    active = false;
    announceStatus("idle", "已暂停");
  }

  function handleStart() {
    active = true;
    announceStatus("listening", "聆听中");
  }

  function handleEnd() {
    active = false;
    if (voiceModeRequested) {
      scheduleRestart("end");
      return;
    }
    announceStatus("idle", "已暂停");
  }

  function handleError(event = {}) {
    const error = event.error || "unknown";
    active = false;
    logEntry(`语音识别异常：${error}`);

    if (voiceModeRequested && isRecoverableSpeechError(error)) {
      scheduleRestart(error);
      return;
    }

    voiceModeRequested = false;
    announceStatus("error", "语音异常");
    showFallback();
  }

  function markResult() {
    restartAttempts = 0;
  }

  function isActive() {
    return active;
  }

  function isRequested() {
    return voiceModeRequested;
  }

  return {
    start,
    stop,
    handleStart,
    handleEnd,
    handleError,
    markResult,
    isActive,
    isRequested
  };
}
