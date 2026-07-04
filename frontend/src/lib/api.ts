// lib/api.ts — URL base do backend
const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Remove barra final (trailing slash) para evitar // no meio da URL
const normalized = rawUrl.replace(/\/+$/, '');

export const API_BASE_URL = normalized;