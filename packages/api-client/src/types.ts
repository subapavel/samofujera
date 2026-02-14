export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  locale: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
  force?: boolean;
}

export interface SessionResponse {
  sessionId: string;
  deviceName: string;
  ipAddress: string;
  lastActiveAt: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  locale: string;
  avatarUrl: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  avatarUrl?: string;
}

export interface SessionConflictResponse {
  conflict: boolean;
  existingDevice: string;
  sessionId: string;
}
