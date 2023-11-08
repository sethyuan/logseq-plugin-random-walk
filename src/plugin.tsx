import "@logseq/libs"
import { setup, t } from "logseq-l10n"
import { shuffle } from "rambdax"
import zhCN from "./translations/zh-CN.json"

let results: string[] = []

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  logseq.useSettingsSchema([
    {
      key: "tags",
      title: "",
      description: t(
        "Random walk among pages/blocks with the tags specified here. Leave it empty to walk among all pages.",
      ),
      type: "string",
      default: "",
    },
    {
      key: "shortcut",
      title: "",
      description: t(
        "Shortcut to trigger a random walk. Leave it empty to disable the shortcut.",
      ),
      type: "string",
      default: "",
    },
  ])

  logseq.App.registerCommandPalette(
    {
      key: "random-walk",
      label: t("Random Walk"),
      ...(logseq.settings?.shortcut
        ? { keybinding: { binding: logseq.settings.shortcut } }
        : {}),
    },
    gotoNext,
  )

  const settingsOff = logseq.onSettingsChanged(onSettingsChange)

  logseq.beforeunload(async () => {
    settingsOff()
  })

  console.log("#random-walk loaded")
}

async function getRandomResults(): Promise<string[]> {
  const tags = logseq.settings?.tags
    .split(/[,，]\s*/)
    .map((tag: string) => `"${tag.toLowerCase()}"`)
    .join(" ")

  const results =
    tags === '""'
      ? (
          await logseq.DB.datascriptQuery(
            `[:find (pull ?p [:block/uuid]) :where [?p :block/name] [?p :block/journal? false]]`,
          )
        ).map(([{ uuid }]: { uuid: string }[]) => uuid)
      : (
          await logseq.DB.datascriptQuery(
            `[:find (pull ?b [:block/uuid :block/name])
            :where
            [?t :block/name ?name]
            [(contains? #{${tags}} ?name)]
            (or-join [?b ?t]
              (and
                [?b :block/refs ?t]
                (not [?b :block/pre-block?]))
              (and
                [?pre :block/refs ?t]
                [?pre :block/pre-block? true]
                [?pre :block/page ?b]))]`,
          )
        ).map(
          ([{ uuid, name }]: { uuid: string; name?: string }[]) => name ?? uuid,
        )

  return shuffle(results)
}

async function gotoNext() {
  if (results.length === 0) {
    results = await getRandomResults()
  }
  const next = results.shift()
  if (next) {
    ;(logseq.Editor.scrollToBlockInPage as any)(next)
  }
}

async function onSettingsChange() {
  results = await getRandomResults()
}

logseq.ready(main).catch(console.error)
