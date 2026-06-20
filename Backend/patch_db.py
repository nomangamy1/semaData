import sys
from sqlalchemy import text
# Import your exact factory and db instance from your project modules
from semaData import semaData_app
from extensions import db 

app = semaData_app()

with app.app_context():
    print("Connecting to the database engine...")
    try:
        # 1. Add locked_by column
        db.session.execute(text("""
            ALTER TABLE datasets 
            ADD COLUMN IF NOT EXISTS locked_by INTEGER;
        """))
        
        # 2. Add locked_at column
        db.session.execute(text("""
            ALTER TABLE datasets 
            ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITHOUT TIME ZONE;
        """))
        
        # 3. Safely append foreign key binding back to the "Users" table
        db.session.execute(text("""
            ALTER TABLE datasets 
            DROP CONSTRAINT IF EXISTS fk_datasets_locked_by;
        """))
        db.session.execute(text("""
            ALTER TABLE datasets 
            ADD CONSTRAINT fk_datasets_locked_by 
            FOREIGN KEY (locked_by) REFERENCES "Users"(id) ON DELETE SET NULL;
        """))
        
        db.session.commit()
        print("🚀 Success! Migration columns injected into the datasets table cleanly.")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Execution failed: {e}", file=sys.stderr)
