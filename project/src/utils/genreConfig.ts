import type { ProjectType } from '../types';

export const GENRE_SLUGS_BY_TYPE: Record<ProjectType, string[]> = {
  novel: [
    'drama', 'romance', 'mystery', 'thriller', 'horror', 'fantasy',
    'science_fiction', 'historical', 'literary_fiction', 'magical_realism',
    'psychological', 'dystopian', 'adventure', 'slice_of_life', 'philosophical',
  ],
  short_story: [
    'drama', 'romance', 'mystery', 'thriller', 'horror', 'fantasy',
    'science_fiction', 'historical', 'literary_fiction', 'magical_realism',
    'psychological', 'slice_of_life', 'satire',
  ],
  long_story: [
    'drama', 'romance', 'mystery', 'thriller', 'horror', 'fantasy',
    'science_fiction', 'historical', 'literary_fiction', 'magical_realism',
    'psychological', 'dystopian', 'adventure',
  ],
  book: [
    'educational', 'philosophical', 'historical', 'political',
    'slice_of_life', 'literary_fiction',
  ],
  film_script: [
    'action', 'thriller', 'crime', 'mystery', 'horror', 'adventure',
    'science_fiction', 'superhero', 'war', 'political', 'spy', 'survival', 'noir',
  ],
  tv_series: [
    'drama', 'comedy', 'thriller', 'crime', 'mystery', 'romance',
    'political', 'historical',
  ],
  theatre_play: [
    'tragedy', 'comedy', 'satire', 'historical', 'political', 'absurd',
    'drama', 'philosophical',
  ],
  radio_series: [
    'mystery', 'horror', 'thriller', 'detective', 'drama',
  ],
  children_story: [
    'adventure', 'fairy_tale', 'educational', 'animal_story', 'moral_story', 'fantasy',
  ],
};
