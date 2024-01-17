import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path'
import { exec } from "./src/exec.js"

const run = async () => {
  // Install Dependencies
  {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const { stdout, stderr } = await exec('npm install && npm --loglevel error ci --only=prod', {
      cwd: resolve(__dirname),
    })
    console.log(stdout)
    if (stderr) {
      return Promise.reject(stderr)
    }
  }

  const { default: releaseActionMain } = await import('./src/index.js')
  releaseActionMain()
}

run().catch(console.error)
