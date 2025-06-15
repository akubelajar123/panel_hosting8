import os
import subprocess
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User

nginx_bp = Blueprint('nginx', __name__)

# Default nginx config path (adjust for your system)
NGINX_CONFIG_PATH = '/etc/nginx/nginx.conf'
NGINX_SITES_PATH = '/etc/nginx/sites-available'
NGINX_ENABLED_PATH = '/etc/nginx/sites-enabled'

def run_command(command):
    """Run shell command safely"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return {
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'stdout': '',
            'stderr': 'Command timed out',
            'returncode': -1
        }
    except Exception as e:
        return {
            'success': False,
            'stdout': '',
            'stderr': str(e),
            'returncode': -1
        }

@nginx_bp.route('/nginx/config', methods=['GET'])
@jwt_required()
def get_nginx_config():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Try to read nginx config
        config_content = "# Nginx configuration\n# This is a sample configuration\n\nuser www-data;\nworker_processes auto;\npid /run/nginx.pid;\n\nevents {\n    worker_connections 768;\n}\n\nhttp {\n    sendfile on;\n    tcp_nopush on;\n    tcp_nodelay on;\n    keepalive_timeout 65;\n    types_hash_max_size 2048;\n    \n    include /etc/nginx/mime.types;\n    default_type application/octet-stream;\n    \n    access_log /var/log/nginx/access.log;\n    error_log /var/log/nginx/error.log;\n    \n    gzip on;\n    \n    include /etc/nginx/conf.d/*.conf;\n    include /etc/nginx/sites-enabled/*;\n}"
        
        if os.path.exists(NGINX_CONFIG_PATH):
            try:
                with open(NGINX_CONFIG_PATH, 'r') as f:
                    config_content = f.read()
            except PermissionError:
                pass  # Use default config if can't read
        
        return jsonify({
            'config': config_content,
            'path': NGINX_CONFIG_PATH
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nginx_bp.route('/nginx/config', methods=['POST'])
@jwt_required()
def update_nginx_config():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        config_content = data.get('config', '')
        
        if not config_content:
            return jsonify({'error': 'Configuration content is required'}), 400
        
        # Test nginx configuration first
        test_result = run_command('nginx -t')
        
        return jsonify({
            'message': 'Configuration updated successfully (simulated)',
            'test_result': test_result,
            'note': 'This is a simulation. In production, this would write to nginx config file.'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nginx_bp.route('/nginx/restart', methods=['POST'])
@jwt_required()
def restart_nginx():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Simulate nginx restart
        restart_result = run_command('echo "Simulating nginx restart"')
        
        return jsonify({
            'message': 'Nginx restart completed (simulated)',
            'result': restart_result,
            'note': 'This is a simulation. In production, this would run: systemctl restart nginx'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nginx_bp.route('/nginx/status', methods=['GET'])
@jwt_required()
def get_nginx_status():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Simulate nginx status check
        status_result = run_command('echo "nginx is running (simulated)"')
        
        return jsonify({
            'status': 'running',
            'result': status_result,
            'uptime': '2 days, 3 hours',
            'note': 'This is simulated data'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nginx_bp.route('/nginx/sites', methods=['GET'])
@jwt_required()
def list_nginx_sites():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Simulate site listing
        sites = [
            {
                'name': 'default',
                'enabled': True,
                'domain': 'localhost',
                'root': '/var/www/html'
            },
            {
                'name': 'example.com',
                'enabled': False,
                'domain': 'example.com',
                'root': '/var/www/example.com'
            }
        ]
        
        return jsonify({
            'sites': sites,
            'note': 'This is simulated data'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


