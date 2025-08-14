-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.date (
  date_time timestamp without time zone NOT NULL,
  venue text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_1_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_2_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  match_id uuid NOT NULL DEFAULT gen_random_uuid(),
  accepted boolean,
  CONSTRAINT date_pkey PRIMARY KEY (id),
  CONSTRAINT date_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.match(id)
);
CREATE TABLE public.like (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sender_id uuid NOT NULL DEFAULT gen_random_uuid(),
  receiver_id uuid NOT NULL DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT like_pkey PRIMARY KEY (id),
  CONSTRAINT like_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.user(id),
  CONSTRAINT like_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user(id)
);
CREATE TABLE public.match (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_1_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_2_id uuid NOT NULL DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT match_pkey PRIMARY KEY (id)
);
CREATE TABLE public.message (
  match_id uuid DEFAULT gen_random_uuid(),
  content text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sender_id uuid NOT NULL DEFAULT gen_random_uuid(),
  receiver_id uuid DEFAULT gen_random_uuid(),
  CONSTRAINT message_pkey PRIMARY KEY (id),
  CONSTRAINT message_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.match(id)
);
CREATE TABLE public.personal (
  birthdate timestamp with time zone NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sex text NOT NULL,
  CONSTRAINT personal_pkey PRIMARY KEY (id),
  CONSTRAINT personal_id_fkey FOREIGN KEY (id) REFERENCES public.user(id)
);
CREATE TABLE public.profile (
  interests ARRAY,
  images ARRAY,
  geolocation ARRAY,
  residence text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bio text DEFAULT ''::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.user(id)
);
CREATE TABLE public.user (
  disabled boolean NOT NULL DEFAULT false,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NOT NULL UNIQUE,
  phone text NOT NULL UNIQUE,
  banned boolean NOT NULL DEFAULT false,
  strikes smallint NOT NULL DEFAULT '0'::smallint,
  CONSTRAINT user_pkey PRIMARY KEY (id)
);