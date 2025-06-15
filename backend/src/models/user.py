from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default=\'user\')  # admin, user, readonly
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    def __repr__(self):
        return f\'<User {self.username}>\'

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode(\'utf-8\')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            \'id\': self.id,
            \'username\': self.username,
            \'email\': self.email,
            \'role\': self.role,
            \'is_active\': self.is_active,
            \'created_at\': self.created_at.isoformat() if self.created_at else None,
            \'last_login\': self.last_login.isoformat() if self.last_login else None
        }

class Domain(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey(\'user.id\'), nullable=False)
    status = db.Column(db.String(50), default=\'active\') # Added status column
    expires_at = db.Column(db.DateTime) # Added expires_at column
    document_root = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    ssl_enabled = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship(\'User\', backref=db.backref(\'domains\', lazy=True))

    def to_dict(self):
        return {
            \'id\': self.id,
            \'name\': self.name,
            \'user_id\': self.user_id,
            \'status\': self.status, # Added to dict
            \'expires_at\': self.expires_at.isoformat() if self.expires_at else None, # Added to dict
            \'document_root\': self.document_root,
            \'is_active\': self.is_active,
            \'ssl_enabled\': self.ssl_enabled,
            \'created_at\': self.created_at.isoformat() if self.created_at else None
        }

class DNSRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey(\'domain.id\'), nullable=False)
    record_type = db.Column(db.String(10), nullable=False)  # A, AAAA, CNAME, MX, TXT
    name = db.Column(db.String(255), nullable=False)
    value = db.Column(db.Text, nullable=False)
    ttl = db.Column(db.Integer, default=3600)
    priority = db.Column(db.Integer)  # For MX records
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    domain = db.relationship(\'Domain\', backref=db.backref(\'dns_records\', lazy=True))

    def to_dict(self):
        return {
            \'id\': self.id,
            \'domain_id\': self.domain_id,
            \'record_type\': self.record_type,
            \'name\': self.name,
            \'value\': self.value,
            \'ttl\': self.ttl,
            \'priority\': self.priority,
            \'created_at\': self.created_at.isoformat() if self.created_at else None
        }

class SSLCertificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey(\'domain.id\'), nullable=False)
    certificate_type = db.Column(db.String(20), default=\'letsencrypt\')  # letsencrypt, custom
    certificate_data = db.Column(db.Text)
    private_key = db.Column(db.Text)
    chain_data = db.Column(db.Text)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    auto_renew = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    domain = db.relationship(\'Domain\', backref=db.backref(\'ssl_certificates\', lazy=True))

    def to_dict(self):
        return {
            \'id\': self.id,
            \'domain_id\': self.domain_id,
            \'certificate_type\': self.certificate_type,
            \'expires_at\': self.expires_at.isoformat() if self.expires_at else None,
            \'is_active\': self.is_active,
            \'auto_renew\': self.auto_renew,
            \'created_at\': self.created_at.isoformat() if self.created_at else None
        }

class Database(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey(\'user.id\'), nullable=False)
    db_type = db.Column(db.String(20), default=\'mysql\')  # mysql, postgresql
    db_user = db.Column(db.String(100), nullable=False)
    db_password = db.Column(db.String(255), nullable=False)
    size_mb = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship(\'User\', backref=db.backref(\'databases\', lazy=True))

    def to_dict(self):
        return {
            \'id\': self.id,
            \'name\': self.name,
            \'user_id\': self.user_id,
            \'db_type\': self.db_type,
            \'db_user\': self.db_user,
            \'size_mb\': self.size_mb,
            \'created_at\': self.created_at.isoformat() if self.created_at else None
        }

class EmailAccount(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey(\'domain.id\'), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    quota_mb = db.Column(db.Integer, default=1000)
    used_mb = db.Column(db.Float, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    domain = db.relationship(\'Domain\', backref=db.backref(\'email_accounts\', lazy=True))

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode(\'utf-8\')

    def to_dict(self):
        return {
            \'id\': self.id,
            \'email\': self.email,
            \'domain_id\': self.domain_id,
            \'quota_mb\': self.quota_mb,
            \'used_mb\': self.used_mb,
            \'is_active\': self.is_active,
            \'created_at\': self.created_at.isoformat() if self.created_at else None
        }



