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
      // Site Settings as a singleton - appears as a direct item
      S.listItem()
        .title('Site Settings')
        .icon(() => '⚙️')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
        ),
      // Filter out siteSettings from default list and add other document types
      ...S.documentTypeListItems().filter(
        (listItem) => !['siteSettings'].includes(listItem.getId())
      ),
    ])
