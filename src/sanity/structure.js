import {TaskButtonsTool} from './components/tools/TaskButtonsTool'

export const structure = (S, context) =>
  S.list()
    .title('Content')
    .items([
      // Custom Archive entry to show list view by default
      S.listItem()
        .title('Archive')
        .schemaType('archiveEntry')
        .child(
          S.documentTypeList('archiveEntry')
            .title('Archive Entries')
        ),
      // Filter out siteSettings and archiveEntry from default list and add other document types
      ...S.documentTypeListItems().filter(
        (listItem) => !['siteSettings', 'archiveEntry'].includes(listItem.getId())
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
      S.listItem()
        .title('Task Buttons')
        .icon(() => '🛠️')
        .child(
          S.component()
            .title('Backfill Tag Slugs')
            .component(TaskButtonsTool)
        ),
    ])
