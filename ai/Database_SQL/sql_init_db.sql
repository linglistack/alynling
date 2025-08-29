-- =============================
-- 1. Generic Terms (global glossary)
-- =============================
CREATE TABLE IF NOT EXISTS generic_terms (
    term_id INTEGER PRIMARY KEY AUTOINCREMENT,
    term_name TEXT NOT NULL,
    explanation TEXT,
    example TEXT,
    -- A generic term may also belong to a package (optional)
    package_name TEXT,
    UNIQUE(term_name, package_name)
);

-- =============================
-- 2. Functions
-- =============================
CREATE TABLE IF NOT EXISTS functions (
    function_id INTEGER PRIMARY KEY AUTOINCREMENT,
    function_name TEXT NOT NULL,
    package_name TEXT NOT NULL,
    UNIQUE(function_name, package_name)
);

-- =============================
-- 3. Inputs
-- =============================
CREATE TABLE IF NOT EXISTS inputs (
    input_id INTEGER PRIMARY KEY AUTOINCREMENT,
    function_id INTEGER NOT NULL,
    param_name TEXT NOT NULL,
    explanation TEXT,
    example TEXT,
    omit INTEGER DEFAULT 0,  -- stored as 0/1
    default_value TEXT,
    FOREIGN KEY (function_id) REFERENCES functions (function_id) ON DELETE CASCADE,
    UNIQUE(function_id, param_name)
);

CREATE INDEX IF NOT EXISTS idx_inputs_function_param 
ON inputs (function_id, param_name);

-- =============================
-- 4. Outputs
-- =============================
CREATE TABLE IF NOT EXISTS outputs (
    output_id INTEGER PRIMARY KEY AUTOINCREMENT,
    function_id INTEGER NOT NULL,
    param_name TEXT NOT NULL,
    explanation TEXT,
    example TEXT,
    omit INTEGER DEFAULT 0,
    importance TEXT,
    FOREIGN KEY (function_id) REFERENCES functions (function_id) ON DELETE CASCADE,
    UNIQUE(function_id, param_name)
);

CREATE INDEX IF NOT EXISTS idx_outputs_function_param 
ON outputs (function_id, param_name);
