export const error = (message: string, status: number = 500) => ({
  error: message,
  status,
});
