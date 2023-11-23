import {defineConfig} from 'vite'
import UnpluginInjectPreload from 'unplugin-inject-preload/vite'

export default defineConfig({
  plugins: [
    UnpluginInjectPreload({
      files: [
        {
          entryMatch: /spritesheet.png$/,
        },
        {
          entryMatch: /QuadraatOffcPro[^\/]*\.ttf$/,
          attributes: {
            crossorigin: true
          }
        },
      ],
      injectTo:'custom'
    })
  ]
})
