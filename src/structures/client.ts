import { CommandClient } from '@pikokr/command.ts'
import Discord, { Intents, IntentsString, Message } from 'discord.js'
import { config } from '../config'
import Dokdo from 'dokdo'

export class Client extends CommandClient {
    constructor() {
        super({
            client: new Discord.Client({
                intents: Object.keys(Intents.FLAGS).filter((x) => !(['GUILD_MEMBERS', 'GUILD_PRESENCES'] as IntentsString[]).includes(x as IntentsString)) as IntentsString[],
            }),
            owners: 'auto',
            command: {
                prefix: '!!',
            },
            slashCommands: {
                autoSync: true,
                guild: config.slash.guild,
            },
        })

        this.registry.loadModulesIn('modules')
    }

    async ready(): Promise<void> {
        await super.ready()
        new Dokdo(this.client, {
            prefix: '.',
            noPerm(message: Message): any {},
            owners: this.owners,
        })
    }
}
