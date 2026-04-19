export const devWarn = (message: string): void => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[@dannysir/floating-components] ${message}`);
  }
};
