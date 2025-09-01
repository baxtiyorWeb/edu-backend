export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  step?: string;
}
