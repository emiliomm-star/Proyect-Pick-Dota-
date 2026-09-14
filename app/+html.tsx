// Custom HTML document for the web build (Expo Router, web only).
// This is where we load the Telegram Mini App SDK so the app can run inside
// Telegram. Outside Telegram the script is harmless (window.Telegram is simply
// used only when present).

import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Telegram Mini App SDK — loads before the app so window.Telegram.WebApp exists. */}
        <script src="https://telegram.org/js/telegram-web-app.js" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
