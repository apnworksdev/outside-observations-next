import {TaskButtonsTool} from './components/tools/TaskButtonsTool'

export const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Task Buttons')
        .icon(() => '🛠️')
        .child(
          S.component()
            .title('Backfill Tag Slugs')
            .component(TaskButtonsTool)
        ),
      ...S.documentTypeListItems(),
    ])
