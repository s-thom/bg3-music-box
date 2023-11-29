import {defineConfig} from 'vite'
import UnpluginInjectPreload from 'unplugin-inject-preload/vite'

export default defineConfig({
  plugins: [
    UnpluginInjectPreload({
      files: [
        {
          entryMatch: /spritesheet.webp$/,
        },
        {
          entryMatch: /QuadraatOffcPro[^\/]*\.woff2$/,
          attributes: {
            crossorigin: true
          }
        },
      ],
      injectTo:'custom'
    })
  ]
})
