import { promisify } from 'util'
import { exec as execFunction } from 'child_process'

export const exec = promisify(execFunction)
