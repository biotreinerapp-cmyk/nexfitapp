DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. marketplace_orders -> store_id
    BEGIN
        FOR r IN (
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name 
             AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'marketplace_orders'
              AND kcu.column_name = 'store_id'
              AND tc.constraint_type = 'FOREIGN KEY'
        ) LOOP
            EXECUTE 'ALTER TABLE public.marketplace_orders DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.marketplace_orders 
        ADD CONSTRAINT marketplace_orders_store_id_fkey 
        FOREIGN KEY (store_id) REFERENCES public.marketplace_stores(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'marketplace_orders failed: %', SQLERRM;
    END;

    -- 2. marketplace_order_items -> product_id
    BEGIN
        FOR r IN (
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name 
             AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'marketplace_order_items'
              AND kcu.column_name = 'product_id'
              AND tc.constraint_type = 'FOREIGN KEY'
        ) LOOP
            EXECUTE 'ALTER TABLE public.marketplace_order_items DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.marketplace_order_items 
        ADD CONSTRAINT marketplace_order_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES public.marketplace_products(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'marketplace_order_items failed: %', SQLERRM;
    END;

    -- 3. pix_configs -> marketplace_store_id
    BEGIN
        FOR r IN (
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name 
             AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'pix_configs'
              AND kcu.column_name = 'marketplace_store_id'
              AND tc.constraint_type = 'FOREIGN KEY'
        ) LOOP
            EXECUTE 'ALTER TABLE public.pix_configs DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.pix_configs 
        ADD CONSTRAINT pix_configs_marketplace_store_id_fkey 
        FOREIGN KEY (marketplace_store_id) REFERENCES public.marketplace_stores(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pix_configs failed: %', SQLERRM;
    END;

    -- 4. store_order_items -> product_id
    BEGIN
        FOR r IN (
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name 
             AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'store_order_items'
              AND kcu.column_name = 'product_id'
              AND tc.constraint_type = 'FOREIGN KEY'
        ) LOOP
            EXECUTE 'ALTER TABLE public.store_order_items DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.store_order_items 
        ADD CONSTRAINT store_order_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES public.store_products(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'store_order_items failed: %', SQLERRM;
    END;

END $$;
