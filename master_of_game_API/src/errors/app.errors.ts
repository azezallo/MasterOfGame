export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500, public isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, false);
  }
}

export class AuthError extends AppError {
  constructor(message: string, statusCode: number = 401) {
    super(message, statusCode);
  }
}

export class PersistenceError extends AppError {
  constructor(message: string) {
    super(message, 500, false);
  }
}
