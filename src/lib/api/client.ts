import axios from 'axios'
import { pushNotification } from '../notifications'
import { API_BASE_URL } from './endpoints'
import { extractMessage } from './helpers'

declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressGlobalError?: boolean
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.response.use(
  (response) => {
    const message = extractMessage(response.data)
    if (message) {
      pushNotification({
        title: 'Server message',
        message,
        tone: 'success',
      })
    }
    return response
  },
  (error: unknown) => {
    if (typeof error === 'object' && error) {
      const errorRecord = error as {
        response?: { data?: unknown }
        config?: { suppressGlobalError?: boolean }
      }
      if (!errorRecord.config?.suppressGlobalError) {
        const message = extractMessage(errorRecord.response?.data)
        pushNotification({
          title: 'Request failed',
          message: message ?? 'Something went wrong. Please try again.',
          tone: 'error',
        })
      }
    } else {
      pushNotification({
        title: 'Request failed',
        message: 'Something went wrong. Please try again.',
        tone: 'error',
      })
    }

    return Promise.reject(error)
  },
)
