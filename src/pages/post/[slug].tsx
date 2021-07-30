import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { RichText } from 'prismic-dom';

import { useRouter } from 'next/router';
import Link from 'next/link';
import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';
import Comments from '../../components/Utterance';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface sidePost {
  uid: string;
  title: string;
}

interface PostProps {
  post: Post;
  postNavigation: {
    prevPost: sidePost;
    nextPost: sidePost;
  };
  preview: boolean;
}

export default function Post({
  post,
  postNavigation,
  preview,
}: PostProps): JSX.Element {
  const router = useRouter();

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );
  let formattedUpdateDate = null;

  if (post.last_publication_date != null) {
    formattedUpdateDate = format(
      new Date(post.first_publication_date),
      "'*editado em 'dd MMM yyyy',  às' kk:mm",
      {
        locale: ptBR,
      }
    );
  }

  const numberOfWords = post.data.content.reduce((acc, content) => {
    const numberOfWordsInHeading = content.heading?.split(' ').length || 0;
    const bodyText = RichText.asText(content.body);
    const numberOfWordsInBody = bodyText?.split(' ').length || 0;
    return acc + numberOfWordsInHeading + numberOfWordsInBody;
  }, 0);

  const timeToRead = String(Math.ceil(numberOfWords / 200));

  // If the page is not yet generated, this will be displayed
  // initially until getStaticProps() finishes running
  if (router.isFallback) {
    return <div>Carregando...</div>;
  }
  return (
    <>
      <img
        className={styles.banner}
        src={post.data.banner.url}
        alt="imagemDoBanner"
      />
      <main className={styles.container}>
        <div className={styles.title}>
          <h1>{post.data.title}</h1>
          <span>
            <FiCalendar /> {formattedDate}
          </span>
          <span>
            <FiUser /> {post.data.author}
          </span>
          <span>
            <FiClock /> {`${timeToRead} min`}
          </span>
          <p>{formattedUpdateDate}</p>
        </div>
        {post.data.content.map(content => (
          <div className={styles.content} key={content.heading}>
            <h1> {content.heading} </h1>
            <article
              dangerouslySetInnerHTML={{
                __html: RichText.asHtml(content.body),
              }}
            />
          </div>
        ))}
        <div className={styles.navigationDiv}>
          {postNavigation.prevPost.title && (
            <div>
              <h1>{postNavigation.prevPost.title}</h1>
              <Link href={`/post/${postNavigation.prevPost.uid}`}>
                <p>Post anterior</p>
              </Link>
            </div>
          )}

          {postNavigation.nextPost.title && (
            <div>
              <h1>{postNavigation.nextPost.title}</h1>
              <Link href={`/post/${postNavigation.nextPost.uid}`}>
                <p>Próximo post</p>
              </Link>
            </div>
          )}
        </div>

        <Comments />

        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={styles.exitPreviewButton}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
    }
  );

  const paths = posts.results.map(result => {
    return {
      params: { slug: result.uid },
    };
  });

  return { paths, fallback: true };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });
  // console.log(JSON.stringify(response, null, 2));

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(c => {
        return {
          heading: c.heading,
          body: c.body,
        };
      }),
    },
  };

  const prevPostResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.fist_publication_date desc]',
    }
  );

  const nextPostResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const prevPost = {
    uid: prevPostResponse.results[0]?.uid || null,
    title: prevPostResponse.results[0]?.data.title || null,
  };

  const nextPost = {
    uid: nextPostResponse.results[0]?.uid || null,
    title: nextPostResponse.results[0]?.data.title || null,
  };

  const postNavigation = {
    prevPost,
    nextPost,
  };

  return {
    props: { post, postNavigation, preview },
  };
};
