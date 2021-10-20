import { BuiltInModule, command, ownerOnly } from '@pikokr/command.ts'
import { Client } from '../../structures/client'
import { Message } from 'discord.js'

class Dev extends BuiltInModule {
    constructor(private cts: Client) {
        super()
    }

    @command()
    @ownerOnly
    async reload(msg: Message) {
        await msg.react('🤔')
        const data = await this.cts.registry.reloadAll()
        await msg.react('✅')
        await msg.reply({
            content: '```\n' + data.map((x) => (x.success ? `✅ ${x.path}` : `❌ ${x.path}\n${x.error}`)).join('\n') + '```',
        })
    }
}

export function install(cts: Client) {
    return new Dev(cts)
}
