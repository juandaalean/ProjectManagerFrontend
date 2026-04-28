export type AuthToken = {
  accessToken: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  name: string
  email: string
  password: string
}

export type AuthUser = {
  userId: string
  name: string
  email: string
  rol: string
}

export type AuthResponse = {
  accessToken: string
  tokenType: string
  expiresAtUtc: string
  user: AuthUser
}
