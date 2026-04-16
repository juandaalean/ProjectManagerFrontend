import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import type { ProblemDetails } from './problemDetails';

function getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
}

export const httpClient = axios.create({
    baseURL: env.apiUrl,
    timeout: 15_000,
    headers: {
        'Content-Type': 'application/json',
    },
});

httpClient.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${token}`
    }
    return config;
})

httpClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const data = error.response?.data as ProblemDetails | undefined;

        if (error.response?.status === 401) {
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
        }

        return Promise.reject({
            ...error,
            problemDetails: data,
        })
    }
)