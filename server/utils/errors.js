class HttpError extends Error {
  constructor(status, message, detail = null) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

const asHttpError = (error, fallbackStatus = 500) => {
  if (error instanceof HttpError) {
    return error;
  }
  return new HttpError(fallbackStatus, error.message || "Error", error.detail || null);
};

module.exports = { HttpError, asHttpError };
