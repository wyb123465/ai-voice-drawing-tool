export function scheduleDemoReplay(commands, runCommand, scheduler = defaultScheduler) {
  if (!Array.isArray(commands) || !commands.length || typeof runCommand !== "function") {
    return false;
  }

  scheduler(() => {
    for (const command of commands) {
      runCommand(command);
    }
  });
  return true;
}

function defaultScheduler(callback) {
  return setTimeout(callback, 0);
}
