/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_COGNITO_REGION: string;
  readonly VITE_COGNITO_APP_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
