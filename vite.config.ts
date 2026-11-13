import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // Google Cloud SDKs (gRPC, protobuf, dynamic requires) must not be bundled:
    // keep them external so Nitro traces and copies them into .output/server/node_modules.
    nitro({
      rollupConfig: {
        external: [/^@google-cloud\//, /^@google\/genai/, /^google-gax/],
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
