CREATE TABLE public.chat (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chat_pkey PRIMARY KEY (id),
  CONSTRAINT chat_id_fkey FOREIGN KEY (id) REFERENCES public.match(id)
);
-- insert for all users, delete for matched users

CREATE TABLE public.chat_message (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  text text NOT NULL,
  to_id uuid NOT NULL,
  from_id uuid NOT NULL,
  match_id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chat_message_pkey PRIMARY KEY (id),
  CONSTRAINT message_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.chat(id)
);
-- insert for all users, select for sender and receiver

CREATE TABLE public.date (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT date_pkey PRIMARY KEY (id),
  CONSTRAINT date_id_fkey1 FOREIGN KEY (id) REFERENCES public.match(id)
);
-- insert for all users, select for matched users

CREATE TABLE public.date_params (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  duration ARRAY NOT NULL DEFAULT '{}'::timestamp with time zone[],
  location ARRAY NOT NULL DEFAULT '{}'::real[],
  venue text NOT NULL DEFAULT ''::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT date_params_pkey PRIMARY KEY (id),
  CONSTRAINT date_params_id_fkey FOREIGN KEY (id) REFERENCES public.match(id)
);
-- insert for all users, select and update for matched users

CREATE TABLE public.date_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT date_status_pkey PRIMARY KEY (id),
  CONSTRAINT date_status_id_fkey FOREIGN KEY (id) REFERENCES public.date(id)
);
-- insert for all users, select and update for matched users

CREATE TABLE public.invite (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  to_id uuid NOT NULL,
  from_id uuid NOT NULL,
  CONSTRAINT invite_pkey PRIMARY KEY (id),
  CONSTRAINT invite_to_id_fkey FOREIGN KEY (to_id) REFERENCES public.user(id)
);
-- insert for all users, select for sender and receiver

CREATE TABLE public.invite_params (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  duration ARRAY NOT NULL DEFAULT '{}'::timestamp with time zone[],
  location ARRAY NOT NULL DEFAULT '{}'::real[],
  venue text NOT NULL DEFAULT ''::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invite_params_pkey PRIMARY KEY (id),
  CONSTRAINT invite_params_id_fkey FOREIGN KEY (id) REFERENCES public.invite(id)
);
-- insert for all users, select for sender and receiver, update for sender

CREATE TABLE public.invite_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT invite_status_pkey PRIMARY KEY (id),
  CONSTRAINT invite_status_id_fkey FOREIGN KEY (id) REFERENCES public.invite(id)
);
-- insert and select for all users, update for sender and receiver

CREATE TABLE public.like (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  to_id uuid NOT NULL,
  from_id uuid NOT NULL,
  CONSTRAINT like_pkey PRIMARY KEY (id),
  CONSTRAINT Like_to_id_fkey FOREIGN KEY (to_id) REFERENCES public.user(id)
);
-- insert for all users, select for receiver

CREATE TABLE public.like_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT like_status_pkey PRIMARY KEY (id),
  CONSTRAINT like_status_id_fkey FOREIGN KEY (id) REFERENCES public.like(id)
);
-- insert for all users, select and update for receiver

CREATE TABLE public.match (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  liked_first_id uuid NOT NULL,
  liked_back_id uuid NOT NULL,
  CONSTRAINT match_pkey PRIMARY KEY (id),
  CONSTRAINT match_liked_first_id_fkey FOREIGN KEY (liked_first_id) REFERENCES public.user(id),
  CONSTRAINT match_liked_back_id_fkey FOREIGN KEY (liked_back_id) REFERENCES public.user(id)
);
-- insert for all users, select for matched users

CREATE TABLE public.match_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT match_status_pkey PRIMARY KEY (id),
  CONSTRAINT match_status_id_fkey FOREIGN KEY (id) REFERENCES public.match(id)
);
-- insert for all users, select and update for matched users

CREATE TABLE public.user (
  id uuid NOT NULL,
  name text NOT NULL,
  birthdate timestamp with time zone NOT NULL,
  sex boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_pkey PRIMARY KEY (id)
);
-- insert for all users, update for admin

CREATE TABLE public.user_profile (
  id uuid NOT NULL,
  bio text DEFAULT ''::text,
  residence text NOT NULL,
  disabled boolean NOT NULL DEFAULT false,
  geolocation ARRAY NOT NULL DEFAULT '{}'::real[],
  interests ARRAY NOT NULL DEFAULT '{}'::text[],
  images ARRAY NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT user_profile_pkey PRIMARY KEY (id),
  CONSTRAINT profile_id_fkey FOREIGN KEY (id) REFERENCES public.user(id)
);
-- insert and select for all users, update for this user

CREATE TABLE public.user_status (
  id uuid NOT NULL,
  banned boolean NOT NULL DEFAULT false,
  CONSTRAINT user_status_pkey PRIMARY KEY (id),
  CONSTRAINT status_id_fkey FOREIGN KEY (id) REFERENCES public.user(id)
);
-- insert for all users, update for admin

CREATE TABLE public.user_updated (
  id uuid NOT NULL,
  images timestamp with time zone NOT NULL DEFAULT now(),
  interests timestamp with time zone NOT NULL DEFAULT now(),
  bio timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_updated_pkey PRIMARY KEY (id),
  CONSTRAINT user_profile_updated_at_id_fkey FOREIGN KEY (id) REFERENCES public.user(id)
);
-- insert for all users, update for this user