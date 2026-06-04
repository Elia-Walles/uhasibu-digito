-- CreateTable
CREATE TABLE `tenants` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `tier` VARCHAR(191) NOT NULL DEFAULT 'free',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenants_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `email_verified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'Accountant',
    `initials` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NULL,
    `tenant_id` VARCHAR(191) NULL,
    `department_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_tenant_id_idx`(`tenant_id`),
    INDEX `users_department_id_idx`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `provider_account_id` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `accounts_user_id_idx`(`user_id`),
    UNIQUE INDEX `accounts_provider_provider_account_id_key`(`provider`, `provider_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `session_token` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_session_token_key`(`session_token`),
    INDEX `sessions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_tokens` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verification_tokens_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memberships` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `memberships_user_id_idx`(`user_id`),
    INDEX `memberships_tenant_id_idx`(`tenant_id`),
    UNIQUE INDEX `memberships_user_id_tenant_id_key`(`user_id`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `departments_tenant_id_idx`(`tenant_id`),
    INDEX `departments_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coa_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `parent_code` VARCHAR(191) NULL,
    `opening_balance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `movement` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `closing_balance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `level` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `coa_accounts_tenant_id_idx`(`tenant_id`),
    INDEX `coa_accounts_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    UNIQUE INDEX `coa_accounts_tenant_id_code_key`(`tenant_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_entry_groups` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `narration` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Posted',
    `posted_by_id` VARCHAR(191) NULL,
    `posted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `edited_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `journal_entry_groups_tenant_id_idx`(`tenant_id`),
    INDEX `journal_entry_groups_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    UNIQUE INDEX `journal_entry_groups_tenant_id_reference_key`(`tenant_id`, `reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gl_entries` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `narration` TEXT NOT NULL,
    `account` VARCHAR(191) NOT NULL,
    `account_code` VARCHAR(191) NOT NULL,
    `cost_centre` VARCHAR(191) NOT NULL DEFAULT 'HQ',
    `debit` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `credit` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `balance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `posted_by` VARCHAR(191) NOT NULL,
    `posted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'Posted',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `gl_entries_tenant_id_idx`(`tenant_id`),
    INDEX `gl_entries_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `gl_entries_tenant_id_date_idx`(`tenant_id`, `date`),
    INDEX `gl_entries_tenant_id_account_code_date_idx`(`tenant_id`, `account_code`, `date`),
    INDEX `gl_entries_tenant_id_reference_idx`(`tenant_id`, `reference`),
    INDEX `gl_entries_group_id_idx`(`group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `account_name` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'TZS',
    `balance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `balance_usd` DECIMAL(20, 2) NULL,
    `coa_account_code` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `bank_accounts_tenant_id_idx`(`tenant_id`),
    INDEX `bank_accounts_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `bank_account_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `description` TEXT NOT NULL,
    `debit` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `credit` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `balance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `reference` VARCHAR(191) NOT NULL,
    `matched` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `bank_transactions_tenant_id_idx`(`tenant_id`),
    INDEX `bank_transactions_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `bank_transactions_tenant_id_bank_account_id_date_idx`(`tenant_id`, `bank_account_id`, `date`),
    INDEX `bank_transactions_bank_account_id_idx`(`bank_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact_person` VARCHAR(191) NOT NULL,
    `tin` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `credit_limit` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `outstanding_balance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `payment_terms` VARCHAR(191) NOT NULL,
    `total_revenue` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `country` VARCHAR(191) NULL,
    `swift_bic` VARCHAR(191) NULL,
    `beneficiary_bank` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `is_international` BOOLEAN NULL,
    `lead_source` VARCHAR(191) NULL,
    `assigned_to` VARCHAR(191) NULL,
    `last_contact` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `customers_tenant_id_idx`(`tenant_id`),
    INDEX `customers_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `issue_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `subtotal` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `vat_amount` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `efd_number` VARCHAR(191) NOT NULL,
    `notes` TEXT NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `invoices_tenant_id_idx`(`tenant_id`),
    INDEX `invoices_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `invoices_tenant_id_status_due_date_idx`(`tenant_id`, `status`, `due_date`),
    INDEX `invoices_tenant_id_customer_id_issue_date_idx`(`tenant_id`, `customer_id`, `issue_date`),
    INDEX `invoices_customer_id_idx`(`customer_id`),
    UNIQUE INDEX `invoices_tenant_id_number_key`(`tenant_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_lines` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `discount_pct` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `vat_pct` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `invoice_lines_tenant_id_idx`(`tenant_id`),
    INDEX `invoice_lines_invoice_id_idx`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotations` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NOT NULL,
    `subtotal` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `vat_amount` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `notes` TEXT NULL,
    `converted_invoice_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `quotations_tenant_id_idx`(`tenant_id`),
    INDEX `quotations_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `quotations_customer_id_idx`(`customer_id`),
    UNIQUE INDEX `quotations_tenant_id_number_key`(`tenant_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_lines` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `quotation_id` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `discount_pct` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `vat_pct` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `quotation_lines_tenant_id_idx`(`tenant_id`),
    INDEX `quotation_lines_quotation_id_idx`(`quotation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `send_log_entries` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'Queued',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `send_log_entries_tenant_id_idx`(`tenant_id`),
    INDEX `send_log_entries_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `send_log_entries_invoice_id_idx`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'New',
    `temperature` VARCHAR(191) NOT NULL,
    `assigned_to` VARCHAR(191) NOT NULL,
    `expected_value` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `follow_up_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `leads_tenant_id_idx`(`tenant_id`),
    INDEX `leads_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pipeline_deals` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `deal_name` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `contact_name` VARCHAR(191) NOT NULL,
    `value` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `probability` INTEGER NOT NULL DEFAULT 0,
    `stage` VARCHAR(191) NOT NULL DEFAULT 'Lead',
    `assigned_to` VARCHAR(191) NOT NULL,
    `assigned_initials` VARCHAR(191) NOT NULL,
    `expected_close_date` DATETIME(3) NULL,
    `days_in_stage` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `pipeline_deals_tenant_id_idx`(`tenant_id`),
    INDEX `pipeline_deals_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `on_hand` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `reorder_level` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `unit_cost` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `selling_price` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total_value` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `location` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NOT NULL,
    `costing_method` VARCHAR(191) NOT NULL DEFAULT 'WeightedAverage',
    `status` VARCHAR(191) NOT NULL DEFAULT 'InStock',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `inventory_items_tenant_id_idx`(`tenant_id`),
    INDEX `inventory_items_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    UNIQUE INDEX `inventory_items_tenant_id_code_key`(`tenant_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `item_code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `unit_cost` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total_value` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `balance_after` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `narration` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `stock_movements_tenant_id_idx`(`tenant_id`),
    INDEX `stock_movements_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `stock_movements_tenant_id_item_id_date_idx`(`tenant_id`, `item_id`, `date`),
    INDEX `stock_movements_item_id_idx`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact_person` VARCHAR(191) NOT NULL,
    `tin` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `payment_terms` VARCHAR(191) NOT NULL,
    `outstanding_balance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `credit_limit` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `performance_rating` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `bank_name` VARCHAR(191) NOT NULL,
    `bank_account` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `suppliers_tenant_id_idx`(`tenant_id`),
    INDEX `suppliers_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `supplier_id` VARCHAR(191) NOT NULL,
    `supplier_name` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `expected_delivery` DATETIME(3) NOT NULL,
    `subtotal` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `vat_amount` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `po_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `grn_received` BOOLEAN NOT NULL DEFAULT false,
    `invoice_received` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `purchase_orders_tenant_id_idx`(`tenant_id`),
    INDEX `purchase_orders_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `purchase_orders_supplier_id_idx`(`supplier_id`),
    UNIQUE INDEX `purchase_orders_tenant_id_number_key`(`tenant_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `po_lines` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `purchase_order_id` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `po_lines_tenant_id_idx`(`tenant_id`),
    INDEX `po_lines_purchase_order_id_idx`(`purchase_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_number` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `employment_type` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `basic_salary` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `housing_allowance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `transport_allowance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `other_allowances` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `gross_salary` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `nssf` VARCHAR(191) NOT NULL,
    `tin` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `bank_account` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `leave_balance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `has_heslb` BOOLEAN NOT NULL DEFAULT false,
    `overtime_rate` DECIMAL(20, 2) NULL,
    `overtime_hours_default` DECIMAL(20, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `employees_tenant_id_idx`(`tenant_id`),
    INDEX `employees_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    UNIQUE INDEX `employees_tenant_id_employee_number_key`(`tenant_id`, `employee_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_allowances` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `taxable` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `employee_allowances_tenant_id_idx`(`tenant_id`),
    INDEX `employee_allowances_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_runs` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `processed_at` DATETIME(3) NULL,
    `total_gross` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total_paye` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total_nssf` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total_sdl` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total_wcf` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `total_net` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `payroll_runs_tenant_id_idx`(`tenant_id`),
    INDEX `payroll_runs_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    UNIQUE INDEX `payroll_runs_tenant_id_period_key`(`tenant_id`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_run_employees` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `payroll_run_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NULL,
    `employee_name` VARCHAR(191) NOT NULL,
    `gross_pay` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `paye` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `nssf_employee` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `nssf_employer` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `wcf` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `sdl` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `heslb` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `net_pay` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `payroll_run_employees_tenant_id_idx`(`tenant_id`),
    INDEX `payroll_run_employees_payroll_run_id_idx`(`payroll_run_id`),
    INDEX `payroll_run_employees_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_filings` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `amount` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Upcoming',
    `filed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `tax_filings_tenant_id_idx`(`tenant_id`),
    INDEX `tax_filings_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `tax_filings_tenant_id_status_due_date_idx`(`tenant_id`, `status`, `due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vat_returns` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `output_vat` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `input_vat` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `vat_payable` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `vat_returns_tenant_id_idx`(`tenant_id`),
    INDEX `vat_returns_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    UNIQUE INDEX `vat_returns_tenant_id_period_key`(`tenant_id`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vat_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `vat_return_id` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `net_amount` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `vat_rate` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `vat_amount` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `vat_transactions_tenant_id_idx`(`tenant_id`),
    INDEX `vat_transactions_vat_return_id_idx`(`vat_return_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fixed_assets` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `acquisition_date` DATETIME(3) NOT NULL,
    `cost` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `residual_value` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `useful_life_years` INTEGER NOT NULL DEFAULT 0,
    `depreciation_method` VARCHAR(191) NOT NULL,
    `accumulated_depreciation` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `net_book_value` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `disposal_date` DATETIME(3) NULL,
    `disposal_proceeds` DECIMAL(20, 2) NULL,
    `gain_loss` DECIMAL(20, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `fixed_assets_tenant_id_idx`(`tenant_id`),
    INDEX `fixed_assets_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    UNIQUE INDEX `fixed_assets_tenant_id_code_key`(`tenant_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_lines` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `line_item` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `annual_budget` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `mtd_budget` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `mtd_actual` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `mtd_variance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `ytd_budget` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `ytd_actual` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `ytd_variance` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `budget_lines_tenant_id_idx`(`tenant_id`),
    INDEX `budget_lines_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_engagements` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `auditor_name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `audit_engagements_tenant_id_idx`(`tenant_id`),
    INDEX `audit_engagements_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_step_results` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `engagement_id` VARCHAR(191) NULL,
    `procedure` VARCHAR(191) NOT NULL,
    `step_key` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `notes` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `audit_step_results_tenant_id_idx`(`tenant_id`),
    INDEX `audit_step_results_engagement_id_idx`(`engagement_id`),
    UNIQUE INDEX `audit_step_results_tenant_id_procedure_step_key_key`(`tenant_id`, `procedure`, `step_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` VARCHAR(191) NULL,
    `user_name` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `record_ref` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NOT NULL,
    `details` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,

    INDEX `audit_logs_tenant_id_idx`(`tenant_id`),
    INDEX `audit_logs_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
