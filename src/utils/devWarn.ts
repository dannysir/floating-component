export const devWarn = (message: string): void => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[react-tree-layout] ${message}`);
  }
};
