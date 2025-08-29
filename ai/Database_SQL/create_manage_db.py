import sqlite3
import yaml
import os, json
from pathlib import Path


def init_db(db_path: str, schema_file: str = "Database_SQL/sql_init_db.sql"):
    conn = sqlite3.connect(db_path)

    # Turn on foreign key enforcement
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    # Load DDL from external file
    with open(schema_file, "r", encoding="utf-8") as f:
        ddl_script = f.read()

    cursor.executescript(ddl_script)

    conn.commit()
    conn.close()
    print(f"Database initialized at {db_path} using {schema_file}")




class DBManager:
    def __init__(self, db_path):
        self.db_path = db_path

    def _execute(self, query, params=()):
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON;")  # enforce FK constraints
        cur = conn.cursor()
        cur.execute(query, params)
        conn.commit()
        conn.close()

    # ----------------------
    # INSERT METHODS
    # ----------------------

    def insert_function(self, function_name, package_name):
        self._execute("""
            INSERT INTO functions (function_name, package_name)
            VALUES (?, ?)
            ON CONFLICT(function_name, package_name) DO NOTHING
        """, (function_name, package_name))

    def insert_input(self, function_id, param_name, explanation="", example="", 
                     omit=False, default_value=None):
        self._execute("""
            INSERT INTO inputs (function_id, param_name, explanation, example, omit, default_value)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(function_id, param_name)
            DO UPDATE SET explanation=excluded.explanation,
                          example=excluded.example,
                          omit=excluded.omit,
                          default_value=excluded.default_value
        """, (function_id, param_name, explanation, example, int(omit), default_value))

    def insert_output(self, function_id, param_name, explanation="", example="", 
                      omit=False, importance=None):
        self._execute("""
            INSERT INTO outputs (function_id, param_name, explanation, example, omit, importance)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(function_id, param_name)
            DO UPDATE SET explanation=excluded.explanation,
                          example=excluded.example,
                          omit=excluded.omit,
                          importance=excluded.importance
        """, (function_id, param_name, explanation, example, int(omit), importance))

    def insert_generic_term(self, term_name, explanation="", example="", package_name=None):
        self._execute("""
            INSERT INTO generic_terms (term_name, explanation, example, package_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(term_name, package_name) DO UPDATE SET
                explanation=excluded.explanation,
                example=excluded.example
        """, (term_name, explanation, example, package_name))
    # ----------------------
    # DELETE METHODS
    # ----------------------
    def delete_generic_term(self, term_id):
        self._execute("DELETE FROM generic_terms WHERE term_id = ?", (term_id,))

    def delete_function(self, function_id):
        self._execute("DELETE FROM functions WHERE function_id = ?", (function_id,))

    def delete_input(self, input_id):
        self._execute("DELETE FROM inputs WHERE input_id = ?", (input_id,))

    def delete_output(self, output_id):
        self._execute("DELETE FROM outputs WHERE output_id = ?", (output_id,))

    # ----------------------
    # HELPER METHODS
    # ----------------------
    def get_function_id(self, function_name, package_name):
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON;")
        cur = conn.cursor()
        cur.execute("SELECT function_id FROM functions WHERE function_name=? AND package_name=?", 
                    (function_name, package_name))
        row = cur.fetchone()
        conn.close()
        return row[0] if row else None

    # ----------------------
    # INGEST JSON → SQL
    # ----------------------
    def ingest_params_from_dir(self, params_root):
        """
        Walk through all package folders under params_root,
        read input.json and output.json, and load into SQL DB.
        """
        for package in os.listdir(params_root):
            package_dir = os.path.join(params_root, package)
            if not os.path.isdir(package_dir):
                continue

            # process input.json
            # process input.json
            input_path = os.path.join(package_dir, "input.json")
            if os.path.exists(input_path):
                with open(input_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                for fn_name, params in data.items():
                    self.insert_function(fn_name, package)
                    fn_id = self.get_function_id(fn_name, package)

                    # Now params is always a dict of parameters
                    for param_name, attrs in params.items():
                        self.insert_input(
                            fn_id,
                            param_name,
                            explanation=attrs.get("explanation", ""),
                            example=attrs.get("example"),
                            omit=attrs.get("omit", False),
                            default_value=attrs.get("default")
                        )

            # process output.json (different shape!)
            output_path = os.path.join(package_dir, "output.json")
            if os.path.exists(output_path):
                with open(output_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for fn_name, outputs in data.items():
                    self.insert_function(fn_name, package)
                    fn_id = self.get_function_id(fn_name, package)
                    for param_name, attrs in outputs.items():
                        self.insert_output(
                            fn_id,
                            param_name,
                            explanation=attrs.get("explanation", ""),
                            example=attrs.get("example"),
                            omit=attrs.get("omit", False),
                            importance=attrs.get("importance")
                        )
        generic_path = os.path.join(params_root, "generic.json")

        if os.path.exists(generic_path):
            with open(generic_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        for term_name, attrs in data.items():
            self.insert_generic_term(
                term_name,
                explanation=attrs.get("explanation", ""),
                example=attrs.get("example", ""),
                package_name="GENERIC"
            )


    def get_table_counts(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        counts = {}
        for table in ["functions", "inputs", "outputs", "generic_terms"]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cur.fetchone()[0]
        conn.close()
        return counts





if __name__ == "__main__":
    # ----------------------
    # Load config
    # ----------------------
    with open("config/settings.yaml", "r") as f:
        config = yaml.safe_load(f)

    DB_PATH = Path(config["paths"]["params_db"])
    PARAMS_DIR = Path(config["paths"]["params_json"])  # add this to your yaml

    # ----------------------
    # Initialize DB
    # ----------------------
    init_db(DB_PATH, schema_file="Database_SQL/sql_init_db.sql")

    # ----------------------
    # Ingest JSON files under params/
    # ----------------------
    db = DBManager(DB_PATH)
    db.ingest_params_from_dir(PARAMS_DIR)

    print("Database built and populated successfully.")
    print("Row counts:", db.get_table_counts())

