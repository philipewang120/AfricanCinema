--
-- PostgreSQL database dump
--

\restrict JdlmmCIFloiL3bZidjfZiEOAnygWa8LbjlWZ8xjgQNFikDxdijuaZIEujCWM4cz

-- Dumped from database version 18.4 (eaf151e)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: african_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.african_submissions (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    original_title character varying(255),
    origin_country character varying(10),
    original_language character varying(10),
    release_year integer,
    release_date date,
    poster_url text,
    backdrop_url text,
    synopsis text,
    director character varying(255),
    cast_list text[],
    genres text[],
    runtime integer,
    trailer_url text,
    streaming_links jsonb,
    submitted_by integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_notes text,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT african_submissions_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: african_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.african_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: african_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.african_submissions_id_seq OWNED BY public.african_submissions.id;


--
-- Name: african_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.african_submissions ALTER COLUMN id SET DEFAULT nextval('public.african_submissions_id_seq'::regclass);


--
-- Data for Name: african_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.african_submissions (id, title, original_title, origin_country, original_language, release_year, release_date, poster_url, backdrop_url, synopsis, director, cast_list, genres, runtime, trailer_url, streaming_links, submitted_by, status, admin_notes, reviewed_by, reviewed_at, created_at) FROM stdin;
\.


--
-- Name: african_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.african_submissions_id_seq', 1, false);


--
-- Name: african_submissions african_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.african_submissions
    ADD CONSTRAINT african_submissions_pkey PRIMARY KEY (id);


--
-- Name: idx_african_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_african_submissions_status ON public.african_submissions USING btree (status);


--
-- Name: african_submissions african_submissions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.african_submissions
    ADD CONSTRAINT african_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: african_submissions african_submissions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.african_submissions
    ADD CONSTRAINT african_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict JdlmmCIFloiL3bZidjfZiEOAnygWa8LbjlWZ8xjgQNFikDxdijuaZIEujCWM4cz

