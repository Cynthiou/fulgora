// Adds req.userId to every Express request. It is only filled by the
// authenticate middleware, hence optional: before it, nobody is connected.
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {};
