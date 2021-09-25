import { listener } from '@pikokr/command.ts'
import { Client } from '../structures/client'
import { ModdedModule } from '../structures/ModdedModule'

class General extends ModdedModule {
    constructor(private cts: Client) {
        super()
    }

    @listener('ready')
    ready() {
        console.log(`Logged in as ${this.cts.client.user!.tag}`)
    }

    @listener('slashCommandError')
    slashError(err: Error) {
        console.error(err)
    }
}

export function install(cts: Client) {
    return new General(cts)
}
