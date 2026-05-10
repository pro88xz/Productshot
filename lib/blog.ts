import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import remarkGfm from 'remark-gfm';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export type BlogPostFrontmatter = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  tags?: string[];
  cover?: string;
  draft?: boolean;
  ogTitle?: string;
  ogDescription?: string;
};

export type BlogPost = {
  slug: string;
  frontmatter: BlogPostFrontmatter;
  content: string;
  htmlContent: string;
};

export type BlogPostMeta = {
  slug: string;
  frontmatter: BlogPostFrontmatter;
};

function blogDirExists(): boolean {
  try {
    return fs.existsSync(BLOG_DIR) && fs.statSync(BLOG_DIR).isDirectory();
  } catch {
    return false;
  }
}

export function getAllPostSlugs(): string[] {
  if (!blogDirExists()) {
    return [];
  }
  try {
    return fs
      .readdirSync(BLOG_DIR)
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!blogDirExists()) {
    return null;
  }
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const processedContent = await remark().use(remarkGfm).use(remarkHtml).process(content);
  const htmlContent = processedContent.toString();

  return {
    slug,
    frontmatter: data as BlogPostFrontmatter,
    content,
    htmlContent,
  };
}

export function getAllPostsMeta(): BlogPostMeta[] {
  const slugs = getAllPostSlugs();
  const posts: BlogPostMeta[] = slugs
    .map((slug) => {
      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(raw);
      return { slug, frontmatter: data as BlogPostFrontmatter };
    })
    .filter((post) => !post.frontmatter.draft)
    .sort((a, b) => {
      return (
        new Date(b.frontmatter.publishedAt).getTime() -
        new Date(a.frontmatter.publishedAt).getTime()
      );
    });
  return posts;
}
