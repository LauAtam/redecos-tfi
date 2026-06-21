


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."ROLES" AS ENUM (
    'ADMIN',
    'CUSTOMER',
    'NODE'
);


ALTER TYPE "public"."ROLES" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  declare
    claims jsonb;
    user_role text;
  begin
    -- Check if the user is in public.profiles and fetch their role
    select role into user_role 
    from public.profiles 
    where id = (event->>'user_id')::uuid;

    -- If no profile exists or role is null, default to CLIENTE
    if user_role is null then
      user_role := 'CLIENTE';
    end if;

    claims := event->'claims';

    -- Check if 'app_metadata' exists in claims
    if jsonb_typeof(claims->'app_metadata') is null then
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    end if;

    -- Set the role claim in app_metadata
    claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(user_role));

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    return event;
  end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    -- Intentamos extraer el nombre y apellido si vienen en los metadatos del registro
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'CLIENTE' -- Rol por defecto duro
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."buy_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "node_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "target_size" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "closed_at" timestamp with time zone,
    CONSTRAINT "check_buy_groups_status" CHECK (("status" = ANY (ARRAY['OPEN'::"text", 'CLOSED'::"text", 'DELIVERED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."buy_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "check_group_orders_quantity" CHECK (("quantity" > 0)),
    CONSTRAINT "check_group_orders_status" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'CONFIRMED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "check_group_orders_unit_price" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."group_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nodos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "manager_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    CONSTRAINT "check_latitude" CHECK ((("latitude" >= '-90.0'::numeric) AND ("latitude" <= 90.0))),
    CONSTRAINT "check_longitude" CHECK ((("longitude" >= '-180.0'::numeric) AND ("longitude" <= 180.0)))
);


ALTER TABLE "public"."nodos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric NOT NULL,
    "bulk_size" integer NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "retail_price" numeric,
    "category_id" "uuid"
);


ALTER TABLE "public"."productos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "role" "text" DEFAULT 'CLIENTE'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "default_node_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."buy_groups"
    ADD CONSTRAINT "buy_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_orders"
    ADD CONSTRAINT "group_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nodos"
    ADD CONSTRAINT "nodos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_buy_groups_node_id_status" ON "public"."buy_groups" USING "btree" ("node_id", "status");



CREATE INDEX "idx_group_orders_group_id" ON "public"."group_orders" USING "btree" ("group_id");



CREATE UNIQUE INDEX "idx_unique_open_group" ON "public"."buy_groups" USING "btree" ("product_id", "node_id") WHERE ("status" = 'OPEN'::"text");



ALTER TABLE ONLY "public"."buy_groups"
    ADD CONSTRAINT "buy_groups_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."nodos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buy_groups"
    ADD CONSTRAINT "buy_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."productos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "fk_profiles_default_node" FOREIGN KEY ("default_node_id") REFERENCES "public"."nodos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_orders"
    ADD CONSTRAINT "group_orders_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."buy_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_orders"
    ADD CONSTRAINT "group_orders_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow admin to manage buy_groups" ON "public"."buy_groups" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Allow admin to manage group_orders" ON "public"."group_orders" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Allow admin to manage nodos" ON "public"."nodos" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Allow admin to manage productos" ON "public"."productos" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Allow insert access for buy_groups to all authenticated" ON "public"."buy_groups" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow public read access for nodos" ON "public"."nodos" FOR SELECT USING (true);



CREATE POLICY "Allow public read access for productos" ON "public"."productos" FOR SELECT USING (true);



CREATE POLICY "Allow read access for buy_groups to all authenticated" ON "public"."buy_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow users to insert their own group_orders" ON "public"."group_orders" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."buy_groups"
  WHERE (("buy_groups"."id" = "group_orders"."group_id") AND ("buy_groups"."status" = 'OPEN'::"text"))))));



CREATE POLICY "Allow users to read their own group_orders" ON "public"."group_orders" FOR SELECT TO "authenticated" USING ((("profile_id" = "auth"."uid"()) OR ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Allow users to update their own group_orders" ON "public"."group_orders" FOR UPDATE TO "authenticated" USING ((("profile_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."buy_groups"
  WHERE (("buy_groups"."id" = "group_orders"."group_id") AND ("buy_groups"."status" = 'OPEN'::"text")))))) WITH CHECK ((("profile_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."buy_groups"
  WHERE (("buy_groups"."id" = "group_orders"."group_id") AND ("buy_groups"."status" = 'OPEN'::"text"))))));



CREATE POLICY "Los usuarios pueden ver su propio perfil" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."buy_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nodos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";






















































































































































REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."buy_groups" TO "anon";
GRANT ALL ON TABLE "public"."buy_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."buy_groups" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."group_orders" TO "anon";
GRANT ALL ON TABLE "public"."group_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."group_orders" TO "service_role";



GRANT ALL ON TABLE "public"."nodos" TO "anon";
GRANT ALL ON TABLE "public"."nodos" TO "authenticated";
GRANT ALL ON TABLE "public"."nodos" TO "service_role";



GRANT ALL ON TABLE "public"."productos" TO "anon";
GRANT ALL ON TABLE "public"."productos" TO "authenticated";
GRANT ALL ON TABLE "public"."productos" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "supabase_auth_admin";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































