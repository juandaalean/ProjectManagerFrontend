import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { env } from '../config/env'
import type { ProblemDetails } from './problemDetails'

export const httpClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
httpClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const authData = localStorage.getItem('authResponse')
    if (authData) {
      try {
        const auth = JSON.parse(authData)
        config.headers.Authorization = `${auth.tokenType} ${auth.accessToken}`
      } catch {
        // Invalid auth data, skip
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.data) {
      const problemDetails: ProblemDetails = error.response.data
      // Log error or handle globally
      console.error('API Error:', problemDetails)
      throw new Error(problemDetails.detail || problemDetails.title || 'An error occurred')
    }
    throw error
  }
)
