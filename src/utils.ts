import JSON5 from 'json5'

declare global {
    interface String {
        replaceAll: (org: string, dest: string) => string
    }
}

String.prototype.replaceAll = function (org, dest) {
    return this.split(org).join(dest as string)
}

export const LevelParser = (level: string) => {
    try {
        return JSON.parse(level)
    } catch (e) {
        return JSON5.parse(
            String(level)
                .trim()
                .replaceAll(', ,', ',')
                .replaceAll('}\n', '},\n')
                .replaceAll('},\n\t]', '}\n\t]')
                .replaceAll(', },', ' },')
                .replaceAll(', }', ' }')
                .replaceAll('\n', '')
                .replaceAll('}\n', '},\n')
        )
    }
}
