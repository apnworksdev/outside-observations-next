import {notFound} from 'next/navigation'

import {previewClient, hasPreviewToken} from '@/sanity/lib/previewClient'
import {WRITING_ARTICLE_PREVIEW_QUERY} from '@/sanity/lib/queries'
import styles from '@app/_assets/writings/writings-article.module.css'
import WritingArticleBody from '@/app/_components/Writings/WritingArticleBody'
import PreviewRefresher from '@/app/_components/Writings/PreviewRefresher'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Preview',
  robots: {index: false, follow: false},
}

async function fetchPreviewArticle(id) {
  const draft = await previewClient.fetch(
    WRITING_ARTICLE_PREVIEW_QUERY,
    {id: `drafts.${id}`},
    {cache: 'no-store'}
  )
  if (draft) return draft
  return previewClient.fetch(WRITING_ARTICLE_PREVIEW_QUERY, {id}, {cache: 'no-store'})
}

export default async function WritingArticlePreviewPage({params}) {
  const {id} = await params
  if (!id) notFound()

  if (!hasPreviewToken) {
    return (
      <main style={{padding: '120px 24px', textAlign: 'center'}}>
        <p>Preview unavailable: SANITY_API_READ_TOKEN is not configured.</p>
      </main>
    )
  }

  const article = await fetchPreviewArticle(id.replace(/^drafts\./, ''))
  if (!article) notFound()

  return (
    <main className={styles.container}>
      <PreviewRefresher />
      <WritingArticleBody article={article} nextArticle={null} showHeader />
    </main>
  )
}
