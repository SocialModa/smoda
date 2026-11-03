/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional build-time admin username (see README, "Admin authentication") */
  readonly VITE_ADMIN_USER?: string;
  /** Optional build-time SHA-256 of "socialmoda:" + password */
  readonly VITE_ADMIN_PASSWORD_SHA256?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
