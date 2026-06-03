import { redirect } from 'next/navigation';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  redirect(`${siteConfig.url}/rss.xml`);
}
