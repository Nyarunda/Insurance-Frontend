/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `backend` for the real backend; anything else (or unset) is the mock demo. */
  readonly VITE_DATA_SOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
