CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: generate_flat_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_flat_user_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  IF NEW.user_id IS NULL THEN
    FOR i IN 1..6 LOOP
      result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    NEW.user_id := result;
  END IF;
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: buildings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buildings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    building_id uuid,
    flat_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: flats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    building_id uuid NOT NULL,
    flat_number text NOT NULL,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    user_id text
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    date timestamp with time zone DEFAULT now(),
    customer_id uuid,
    customer_phone text,
    customer_name text,
    items jsonb,
    sub_total numeric(10,2) DEFAULT 0,
    discount_type text DEFAULT 'amount'::text,
    discount_value numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_rate numeric(5,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    grand_total numeric(10,2) DEFAULT 0,
    status text DEFAULT 'paid'::text,
    cashier_name text,
    amount_received numeric(10,2),
    change_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    barcode text,
    sku text,
    quantity integer DEFAULT 0,
    price numeric(10,2) DEFAULT 0,
    buying_price numeric(10,2) DEFAULT 0,
    discount_limit integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: buildings buildings_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_name_key UNIQUE (name);


--
-- Name: buildings buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: flats flats_building_id_flat_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flats
    ADD CONSTRAINT flats_building_id_flat_number_key UNIQUE (building_id, flat_number);


--
-- Name: flats flats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flats
    ADD CONSTRAINT flats_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: idx_customers_building; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_building ON public.customers USING btree (building_id);


--
-- Name: idx_customers_flat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_flat ON public.customers USING btree (flat_id);


--
-- Name: idx_flats_building; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flats_building ON public.flats USING btree (building_id);


--
-- Name: idx_invoices_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_customer ON public.invoices USING btree (customer_id);


--
-- Name: idx_products_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);


--
-- Name: flats set_flat_user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_flat_user_id BEFORE INSERT ON public.flats FOR EACH ROW EXECUTE FUNCTION public.generate_flat_user_id();


--
-- Name: customers customers_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id);


--
-- Name: customers customers_flat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_flat_id_fkey FOREIGN KEY (flat_id) REFERENCES public.flats(id);


--
-- Name: flats flats_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flats
    ADD CONSTRAINT flats_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: admin_settings Enable all access for admin_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all access for admin_settings" ON public.admin_settings USING (true) WITH CHECK (true);


--
-- Name: buildings Enable all access for buildings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all access for buildings" ON public.buildings USING (true) WITH CHECK (true);


--
-- Name: customers Enable all access for customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all access for customers" ON public.customers USING (true) WITH CHECK (true);


--
-- Name: flats Enable all access for flats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all access for flats" ON public.flats USING (true) WITH CHECK (true);


--
-- Name: invoices Enable all access for invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all access for invoices" ON public.invoices USING (true) WITH CHECK (true);


--
-- Name: products Enable all access for products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all access for products" ON public.products USING (true) WITH CHECK (true);


--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: buildings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: flats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


