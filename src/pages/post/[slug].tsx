import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { RichText } from 'prismic-dom';

import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

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

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  // console.log(JSON.stringify(response, null, 2));

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
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

  return {
    props: { post },
  };
};
