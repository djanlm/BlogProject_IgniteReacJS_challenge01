import { GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import Link from 'next/link';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const { next_page, results } = postsPagination;

  const posts: Post[] = results.map(result => {
    const date = format(
      new Date(result.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    );
    return {
      ...result,
      first_publication_date: date,
    };
  });

  const [theresNextPage, setTheresNextPage] = useState(next_page);
  const [loadedPosts, setLoadedPosts] = useState<Post[]>(posts);

  function handleLoadMorePosts(): void {
    if (theresNextPage) {
      fetch(theresNextPage)
        .then(response => response.json())
        .then(response => {
          const newNextPage = response.next_page;
          const resultsFromNextPage = response.results.map(post => {
            const date = format(
              new Date(post.first_publication_date),
              'dd MMM yyyy',
              {
                locale: ptBR,
              }
            );
            return {
              uid: post.uid,
              first_publication_date: date,
              data: {
                title: post.data.title,
                subtitle: post.data.subtitle,
                author: post.data.author,
              },
            };
          });
          // posts.push(...resultsFromNextPage);
          setLoadedPosts([...loadedPosts, ...resultsFromNextPage]);
          setTheresNextPage(newNextPage);
        });
    }
  }

  return (
    <main className={styles.container}>
      {loadedPosts.map(post => (
        <div className={styles.content} key={post.uid}>
          <Link href={`/post/${post.uid}`}>
            <a>
              <h1>{post.data.title}</h1>
            </a>
          </Link>
          <p>{post.data.subtitle}</p>

          <span>
            <FiCalendar /> {post.first_publication_date}
          </span>
          <span>
            <FiUser /> {post.data.author}
          </span>
        </div>
      ))}

      {theresNextPage ? (
        <button type="button" onClick={handleLoadMorePosts}>
          Carregar mais posts
        </button>
      ) : (
        ''
      )}
    </main>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      // fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  const { next_page } = postsResponse;

  const results = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });
  // console.log(JSON.stringify(postsResponse, null, 2));

  const postsPagination = { next_page, results };
  return {
    props: { postsPagination },
  };
};
