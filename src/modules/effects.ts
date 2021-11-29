import { command, option, optional, slashCommand } from '@pikokr/command.ts'
import { bold, inlineCode, SlashCommandBuilder, underscore } from '@discordjs/builders'
import { CommandInteraction, Message, MessageActionRow, MessageAttachment, MessageButton, MessageComponentInteraction, MessageSelectMenu, SelectMenuInteraction } from 'discord.js'
import { ModdedModule } from '../structures/ModdedModule'
import fetch from 'node-fetch'
import JSZip, { JSZipObject } from 'jszip'
import _ from 'lodash'
import { LevelParser } from '../utils'

class Effects extends ModdedModule {
    constructor() {
        super()
    }

    readableToBuffer(stream: NodeJS.ReadableStream) {
        return new Promise<Buffer>((resolve, reject) => {
            const buf: Buffer[] = []
            stream.on('data', (b) => buf.push(b))
            stream.on('error', reject)
            stream.on('end', () => {
                resolve(Buffer.concat(buf))
            })
        })
    }

    @slashCommand({
        command: new SlashCommandBuilder()
            .setName('remove_effect')
            .setDescription('이펙트 제거')
            .addStringOption((builder) => builder.setName('url').setDescription('zip 파일 URL').setRequired(true)),
    })
    async removeEffectSlash(i: CommandInteraction, @option('url') url: string) {
        return this.executeRemoveEffect(i, url)
    }

    @command({ name: '이펙트제거' })
    async removeEffect(msg: Message, @optional url: string = msg.attachments.first()?.url || '') {
        if (!url) return msg.reply('이펙트를 제거할 zip 파일 업로드 또는 링크를 입력해주세ㅐ요.')
        const m = await msg.channel.send({
            content: '대충 버튼누르세요\n' + url,
            components: [new MessageActionRow().addComponents(new MessageButton().setLabel('실행').setCustomId('run').setStyle('PRIMARY'))],
            allowedMentions: {
                parse: [],
            },
        })

        try {
            const i = await m.awaitMessageComponent({
                filter: async (i) => {
                    return i.user.id === msg.author.id
                },
            })

            try {
                return this.executeRemoveEffect(i, url)
            } catch (e) {
                return msg.reply(`${e}`)
            }
        } catch (e) {
            return
        }
    }

    async executeRemoveEffect(i: CommandInteraction | MessageComponentInteraction, url: string) {
        await i.deferReply()

        let zip: JSZip

        try {
            zip = await JSZip.loadAsync(Buffer.from(await fetch(url).then((x) => x.arrayBuffer())))
        } catch (e) {
            return i.editReply({ content: 'zip 파일 다운로드 실패' })
        }

        await i.editReply('파일 검색중...')

        const filesToInclude: JSZipObject[] = Object.values(zip.files).filter((x) => ['adofai', 'ogg', 'mp3'].some((y) => x.name.endsWith('.' + y)))

        const [adofai, nonAdofai] = _.partition(filesToInclude, (f) => f.name.endsWith('.adofai'))

        let selectedAdofaiFile: JSZipObject

        if (adofai.length > 1) {
            const m = (await i.editReply({
                content: 'adofai 파일이 여러개 감지되었습니다. 파일을 선택해주세요.',
                components: [
                    new MessageActionRow().addComponents(
                        new MessageSelectMenu()
                            .addOptions(
                                adofai.map((x, i) => ({
                                    label: x.name,
                                    value: i.toString(),
                                }))
                            )
                            .setCustomId('select')
                    ),
                ],
            })) as Message

            try {
                const v = (await m.awaitMessageComponent({ componentType: 'SELECT_MENU', filter: (j) => j.user.id === i.user.id })) as SelectMenuInteraction
                await v.deferUpdate()
                const f = v.values[0]
                const adofaiFile = adofai.find((x, i) => i === Number(f))
                if (!adofaiFile) return i.editReply({ content: '선택된 값이 없습니다.', components: [] })

                selectedAdofaiFile = adofaiFile
            } catch (e) {
                return i.editReply({ content: '시간 초과', components: [] })
            }
        } else {
            selectedAdofaiFile = adofai[0]
        }

        const m = (await i.editReply({
            content: `adofai 파일: ${inlineCode(selectedAdofaiFile.name)}\n그 외 포함될 파일: ${inlineCode(nonAdofai.map((x) => x.name).join(', '))}\n진행할까요?`,
            components: [
                new MessageActionRow().addComponents(
                    new MessageButton().setCustomId('yes').setStyle('SUCCESS').setLabel('변환하기'),
                    new MessageButton().setCustomId('no').setStyle('DANGER').setLabel('취소하기')
                ),
            ],
        })) as Message
        let c
        try {
            c = await m.awaitMessageComponent({ componentType: 'BUTTON', filter: (j) => j.user.id === i.user.id })
        } catch (e) {
            return i.editReply({ content: '시간 초과', components: [] })
        }
        await c.deferUpdate()
        if (c.customId === 'yes') {
            try {
                await i.editReply({ content: '변환 진행중...', components: [] })
                const map = LevelParser((await this.readableToBuffer(selectedAdofaiFile.nodeStream())).toString())
                const allowed = ['SetSpeed', 'Twirl', 'SetHitsound', 'Checkpoint']

                map.actions = map.actions.filter((x: { eventType: string }) => allowed.includes(x.eventType))

                const setSppedList = (
                    map.actions.filter((x: { eventType: string }) => x.eventType === 'SetSpeed') as {
                        floor: number
                        speedType: string
                        beatsPerMinute: number
                        bpmMultiplier: number
                    }[]
                ).sort((x, y) => x.floor - y.floor)

                let currentBpm = map.settings.bpm

                for (const action of setSppedList) {
                    if (action.speedType === 'Multiplier') {
                        action.speedType = 'Bpm'
                        action.beatsPerMinute = currentBpm * action.bpmMultiplier
                        currentBpm = action.beatsPerMinute
                    } else {
                        currentBpm = action.beatsPerMinute
                    }
                }

                map.settings.relativeTo = 'Player'

                map.settings.zoom = 150

                map.settings.position = [0, 0]

                await i.editReply('zip 파일 생성중...')

                const zip = new JSZip()

                zip.file('level.adofai', JSON.stringify(map))

                for (const file of nonAdofai) {
                    zip.file(file.name, await this.readableToBuffer(file.nodeStream('nodebuffer')))
                }

                const f = await zip.generateAsync({ type: 'nodebuffer' })
                const title = ((map.settings.artist + ' - ' + map.settings.song).match(/(?:(?![^<>]*(?:>))[^<])+/g) || [map.settings.artist, map.settings.song]).join('')

                const m = (await i.editReply({
                    content: `${bold(title)} by ${bold(map.settings.author)}\n${underscore(map.settings.levelDesc)}`,
                    files: [new MessageAttachment(f, 'level.zip')],
                })) as Message
                await i.editReply(m.content + `\n다운로드: ${m.attachments.first()!.url}`)
            } catch (e: any) {
                await i.editReply(e.message || 'Error')
            }
        } else {
            return i.editReply({ content: '취소되었습니다.', components: [] })
        }
    }
}

export function install() {
    return new Effects()
}
