export const error = (message: string, status: number = 500) => {
  return {
    error: message,
    status,
  };
};
