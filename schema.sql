-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.like (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sender_id uuid NOT NULL DEFAULT gen_random_uuid(),
  receiver_id uuid NOT NULL DEFAULT gen_random_uuid(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT like_pkey PRIMARY KEY (id),
  CONSTRAINT like_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user(id),
  CONSTRAINT like_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.user(id)
);
CREATE TABLE public.match (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_1_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_2_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_1_score smallint,
  user_2_score smallint,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT match_pkey PRIMARY KEY (id),
  CONSTRAINT match_user_2_id_fkey FOREIGN KEY (user_2_id) REFERENCES public.user(id),
  CONSTRAINT match_user_1_id_fkey FOREIGN KEY (user_1_id) REFERENCES public.user(id)
);
CREATE TABLE public.message (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  match_id uuid DEFAULT gen_random_uuid(),
  sender_id uuid DEFAULT gen_random_uuid(),
  receiver_id uuid DEFAULT gen_random_uuid(),
  content text NOT NULL,
  CONSTRAINT message_pkey PRIMARY KEY (id),
  CONSTRAINT message_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user(id),
  CONSTRAINT message_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.user(id),
  CONSTRAINT message_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.match(id)
);
CREATE TABLE public.profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT ''::text,
  sex text NOT NULL DEFAULT ''::text,
  birthday timestamp with time zone NOT NULL DEFAULT now(),
  bio text DEFAULT ''::text,
  interests ARRAY,
  images ARRAY,
  residence text,
  geolocation ARRAY,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.user(id)
);
CREATE TABLE public.quiz (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  questions ARRAY,
  answers ARRAY,
  fake_answers text,
  CONSTRAINT quiz_pkey PRIMARY KEY (id),
  CONSTRAINT quizes_id_fkey FOREIGN KEY (id) REFERENCES public.user(id)
);
CREATE TABLE public.user (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NOT NULL UNIQUE,
  phone text NOT NULL UNIQUE,
  banned boolean NOT NULL DEFAULT false,
  strikes smallint NOT NULL DEFAULT '0'::smallint,
  disabled boolean NOT NULL DEFAULT false,
  CONSTRAINT user_pkey PRIMARY KEY (id)
);