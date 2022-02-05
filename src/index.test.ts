import test from 'ava'
import { testProp, fc } from 'ava-fast-check'
import { Arbitrary } from 'fast-check'
import { PluginContext, Plugin, NormalizedInputOptions } from 'rollup'
import externals, { ExternalsOptions } from './index'
import { join } from "path"

// Returns an arbitrary for generating externals options objects
const externalsOptionsArbitrary = (): Arbitrary<ExternalsOptions> => fc.record({
    packagePath: fc.string(),
    builtins: fc.boolean(),
    prefixedBuiltins: fc.oneof(fc.boolean(), fc.constant<'strip'>('strip')),
    deps: fc.boolean(),
    devDeps: fc.boolean(),
    peerDeps: fc.boolean(),
    optDeps: fc.boolean(),
    include: fc.oneof(fc.string(), fc.array(fc.string())),
    exclude: fc.oneof(fc.string(), fc.array(fc.string())),
    except: fc.oneof(fc.string(), fc.array(fc.string()))
}, { withDeletedKeys: true })

testProp(
    'does not throw on constructing plugin object for valid input',
    [externalsOptionsArbitrary()],
    (t, options) => {
        try {
            externals(options)
            t.pass()
        } catch {
            t.fail()
        }
    }
)

test('marks "dependencies" as external by default', async t => {
    process.chdir(__dirname)

    const source = 'example'
    const importer = 'me'
    const plugin = externals({ packagePath: './fixtures/test.json' }) as Required<Plugin> & PluginContext

    await plugin.buildStart({} as NormalizedInputOptions)
    t.deepEqual(await plugin.resolveId(source, importer, { isEntry: false }), { id: source, external: true })
})

const path = (...paths: string[]): string => join(__dirname, ...paths)

test.serial('monorepo usage', async t => {
    const cwd = path('fixtures/monorepo/packages/package')
    process.chdir(cwd)

    const importer = 'me'
    const plugin = externals() as Required<Plugin> & PluginContext
    await plugin.buildStart({} as NormalizedInputOptions)

    for (const source of ['@babel/core', 'typescript', 'rollup', 'lodash', 'express', 'chalk']) {
        t.deepEqual(await plugin.resolveId(source, importer, { isEntry: false }), { id: source, external: true })
    }
})
