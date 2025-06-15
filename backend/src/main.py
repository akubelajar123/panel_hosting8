import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta

from src.models.user import db, bcrypt, User
from src.routes.user import user_bp
from src.routes.auth import auth_bp
from src.routes.domain import domain_bp
from src.routes.dns import dns_bp
from src.routes.files import files_bp
from src.routes.ssl import ssl_bp
from src.routes.nginx import nginx_bp
from src.routes.php import php_bp
from src.routes.database import database_bp
from src.routes.email import email_bp
from src.routes.terminal import terminal_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Configuration
app.config['SECRET_KEY'] = 'hosting-panel-secret-key-change-in-production'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
CORS(app, origins="*")  # Allow all origins for development
jwt = JWTManager(app)
db.init_app(app)
bcrypt.init_app(app)

## Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(user_bp, url_prefix="/api")
app.register_blueprint(domain_bp, url_prefix="/api")
app.register_blueprint(dns_bp, url_prefix="/api")
app.register_blueprint(files_bp, url_prefix="/api")
app.register_blueprint(ssl_bp, url_prefix="/api")
app.register_blueprint(nginx_bp, url_prefix="/api")
app.register_blueprint(php_bp, url_prefix="/api")
app.register_blueprint(database_bp, url_prefix="/api")
app.register_blueprint(email_bp, url_prefix="/api")
app.register_blueprint(terminal_bp, url_prefix="/api")

with app.app_context():
    db.create_all()
    
    # Create default admin user
    admin_user = User.query.filter_by(username="admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email="admin@hostingpanel.local",
            role="admin",
            is_active=True
        )
        admin_user.set_password("admin123")
        db.session.add(admin_user)
        db.session.commit()
        print("Default admin user created: admin/admin123")
@app.route("/api/health", methods=["GET"])
def health_check():
    return {'status': 'ok', 'message': 'Hosting Panel API is running'}, 200

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "Frontend not built yet", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

