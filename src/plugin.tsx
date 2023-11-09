import "@logseq/libs"
import { setup, t } from "logseq-l10n"
import { shuffle } from "rambdax"
import zhCN from "./translations/zh-CN.json"

const TOOLBAR_ICON = `<svg t="1699491628348" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1452" width="200" height="200"><path d="M488 72.896a48 48 0 0 1 43.456-2.304l4.544 2.304L880.256 271.68a48 48 0 0 1 23.776 36.928l0.224 4.64V710.72a48 48 0 0 1-20.096 39.04l-3.904 2.56-344.256 198.72a48 48 0 0 1-43.456 2.336l-4.544-2.304L143.744 752.32a48 48 0 0 1-23.776-36.928l-0.224-4.64V313.28c0-15.616 7.552-30.112 20.096-39.04l3.904-2.56L488 72.96z m-304.32 282.88l0.032 345.728L480 872.544V531.52l-4-6.944-292.288-168.8z m656.576 0l-292.288 168.768-3.968 6.88v341.12l296.256-171.04V355.776zM384 688.16c17.664 8.736 32 30.176 32 47.84 0 17.664-14.336 24.896-32 16.16-17.664-8.768-32-30.176-32-47.84 0-17.696 14.336-24.928 32-16.16z m384-63.872c17.664-8.64 32-1.376 32 16.32 0 17.664-14.336 39.04-32 47.68-17.664 8.672-32 1.376-32-16.288s14.336-39.04 32-47.68z m-512-0.128c17.664 8.736 32 30.176 32 47.84 0 17.664-14.336 24.896-32 16.16-17.664-8.768-32-30.176-32-47.84 0-17.696 14.336-24.928 32-16.16z m384-64c17.664-8.768 32-1.536 32 16.16 0 17.664-14.336 39.072-32 47.84-17.664 8.736-32 1.504-32-16.16s14.336-39.104 32-47.84z m-256-32c17.664 8.736 32 30.176 32 47.84 0 17.664-14.336 24.896-32 16.16-17.664-8.768-32-30.176-32-47.84 0-17.696 14.336-24.928 32-16.16z m-128-64c17.664 8.736 32 30.176 32 47.84 0 17.664-14.336 24.896-32 16.16-17.664-8.768-32-30.176-32-47.84 0-17.696 14.336-24.928 32-16.16z m256-331.232L218.848 302.144l293.12 169.28 293.12-169.28L512 132.928zM512 272c26.496 0 48 14.336 48 32s-21.504 32-48 32-48-14.336-48-32 21.504-32 48-32z" p-id="1453"></path></svg>`

let results: string[] = []

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  provideStyles()

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

  logseq.App.registerUIItem("toolbar", {
    key: `random-walk`,
    template: `<a class="kef-rw-icon" data-on-click="gotoNext" title="${t(
      "Random Walk",
    )}">${TOOLBAR_ICON}</a>`,
  })

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

function provideStyles() {
  logseq.provideStyle({
    key: "random-walk",
    style: `
    .kef-rw-icon {
      display: flex;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      justify-content: center;
      align-items: center;
      color: var(--ls-header-button-background);
    }
    .kef-rw-icon svg {
      width: 20px;
      height: 20px;
    }
    .kef-rw-icon svg path {
      fill: currentColor;
    }
    .kef-rw-icon:hover {
      background: var(--ls-tertiary-background-color);
    }
    `,
  })
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
            `[:find (pull ?p [:block/name]) :where [?p :block/name] [?p :block/journal? false]]`,
          )
        ).map(([{ name }]: { name: string }[]) => name)
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

const model = {
  gotoNext,
}

logseq.ready(model, main).catch(console.error)
