export class ApiServiceError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiServiceError';
    this.status = status;
  }
}
