import { Module } from '@pikokr/command.ts'

export abstract class ModdedModule extends Module {
    load() {
        console.log(`Loaded ${this.constructor.name}`)
    }

    unload() {
        console.log(`Unloading ${this.constructor.name}`)
    }
}
