export const createRafScheduler = () => {
  let rafId = 0;
  return {
    schedule: (cb: () => void) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        cb();
      });
    },
    cancel: () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
    isPending: () => rafId !== 0,
  };
};
