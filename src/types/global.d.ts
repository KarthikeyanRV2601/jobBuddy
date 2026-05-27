import type { GoogleIdentityServices } from "./gmail";

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

export {};
