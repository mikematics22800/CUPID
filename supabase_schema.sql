-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  likes ARRAY,
  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user1_score real,
  user2_score real,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user1_attempts smallint NOT NULL DEFAULT '0'::smallint,
  user2_attempts smallint NOT NULL DEFAULT '0'::smallint,
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.users(id),
  CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sender_id uuid NOT NULL DEFAULT gen_random_uuid(),
  receiver_id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id)
);
CREATE TABLE public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  questions ARRAY,
  answers ARRAY,
  fake_answers ARRAY,
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL DEFAULT ''::text,
  email text NOT NULL DEFAULT ''::text UNIQUE,
  phone text NOT NULL DEFAULT ''::text UNIQUE,
  sex text NOT NULL DEFAULT ''::text,
  birthday timestamp with time zone NOT NULL DEFAULT now(),
  bio text DEFAULT ''::text,
  interests ARRAY,
  strikes smallint NOT NULL DEFAULT '0'::smallint,
  images ARRAY,
  residence text,
  geolocation ARRAY,
  banned boolean NOT NULL DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);