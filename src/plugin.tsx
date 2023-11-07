import "@logseq/libs"
import { setup, t } from "logseq-l10n"
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

  requestIdleCallback(async () => {
    results = await getRandomResults()
  })

  logseq.beforeunload(async () => {
    settingsOff()
  })

  console.log("#random-walk loaded")
}

async function getRandomResults(): Promise<string[]> {
  // TODO
  return []
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
