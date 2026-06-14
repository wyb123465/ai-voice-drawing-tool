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
  let outputPaused = false;

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
      if (error.name === "InvalidStateError") {
        return "busy";
      }
      console.warn("启动语音识别失败:", error);
      return "failed";
    }
    return "started";
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
        const result = startRecognition();
        if (result === "busy") {
          scheduleRestart("busy");
        } else if (result === "failed") {
          voiceModeRequested = false;
          announceStatus("error", "语音异常");
          showFallback();
          logEntry("语音识别启动失败，请重新点击“启动语音”或使用文本回放。");
        }
      }
    }, restartDelayMs);
  }

  function start() {
    voiceModeRequested = true;
    clearRestartTimer();
    if (outputPaused) {
      return;
    }
    const result = startRecognition();
    if (result === "failed") {
      voiceModeRequested = false;
      announceStatus("error", "语音异常");
      showFallback();
      logEntry("语音识别启动失败，请检查浏览器麦克风权限。");
    }
  }

  function stop() {
    voiceModeRequested = false;
    outputPaused = false;
    clearRestartTimer();
    if (active) {
      recognition.stop();
    }
    active = false;
    announceStatus("idle", "已暂停");
  }

  function handleStart() {
    active = true;
    if (outputPaused) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn("暂停语音识别失败:", error);
      }
      announceStatus("listening", "反馈中");
      return;
    }
    announceStatus("listening", "聆听中");
  }

  function handleEnd() {
    active = false;
    if (outputPaused) {
      announceStatus("listening", "反馈中");
      return;
    }
    if (voiceModeRequested) {
      scheduleRestart("end");
      return;
    }
    announceStatus("idle", "已暂停");
  }

  function handleError(event = {}) {
    const error = event.error || "unknown";
    active = false;
    if (outputPaused && isRecoverableSpeechError(error)) {
      announceStatus("listening", "反馈中");
      return;
    }
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

  function pauseForOutput() {
    if (!voiceModeRequested) {
      return false;
    }
    outputPaused = true;
    clearRestartTimer();
    if (active) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn("暂停语音识别失败:", error);
      }
    }
    announceStatus("listening", "反馈中");
    return true;
  }

  function resumeAfterOutput() {
    if (!outputPaused) {
      return;
    }
    outputPaused = false;
    if (voiceModeRequested && !active) {
      scheduleRestart("speech-output");
    }
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
    pauseForOutput,
    resumeAfterOutput,
    isActive,
    isRequested
  };
}
