import axios from 'axios'
import { API_TIMEOUT_MS } from '../config/apiConfig'

// Shared Axios instance for every backend call; set up once, used by the functions in src/api/.
export const apiClient = axios.create({
  timeout: API_TIMEOUT_MS,
})
