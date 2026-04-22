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
  id: string
  name: string
  email: string
}
