
import os
import subprocess
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User

php_bp = Blueprint("php", __name__)

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

@php_bp.route("/php/versions", methods=["GET"])
@jwt_required()
def get_php_versions():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Try to get actual PHP versions
        versions = []
        
        # Check for common PHP versions
        common_versions = ['7.4', '8.0', '8.1', '8.2', '8.3']
        for version in common_versions:
            result = run_command(f'php{version} --version')
            if result['success']:
                versions.append({
                    'version': version,
                    'status': 'installed',
                    'path': f'/usr/bin/php{version}'
                })
        
        # If no versions found, provide simulated data
        if not versions:
            versions = [
                {'version': '8.1', 'status': 'installed', 'path': '/usr/bin/php8.1'},
                {'version': '8.2', 'status': 'installed', 'path': '/usr/bin/php8.2'},
                {'version': '7.4', 'status': 'available', 'path': '/usr/bin/php7.4'}
            ]
        
        # Get current default version
        current_result = run_command('php --version')
        current_version = 'Unknown'
        if current_result['success']:
            lines = current_result['stdout'].split('\n')
            if lines:
                # Extract version from first line
                import re
                match = re.search(r'PHP (\d+\.\d+)', lines[0])
                if match:
                    current_version = match.group(1)
        
        return jsonify({
            'versions': versions,
            'current': current_version,
            'note': 'Some data may be simulated in development environment'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@php_bp.route("/php/settings", methods=["GET"])
@jwt_required()
def get_php_settings():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Try to get actual PHP settings
        settings = {}
        
        # Get PHP info
        php_info_result = run_command('php -i')
        if php_info_result['success']:
            info_lines = php_info_result['stdout'].split('\n')
            for line in info_lines:
                if '=>' in line:
                    parts = line.split('=>')
                    if len(parts) >= 2:
                        key = parts[0].strip()
                        value = parts[1].strip()
                        
                        # Extract common settings
                        if 'memory_limit' in key.lower():
                            settings['memory_limit'] = value
                        elif 'max_execution_time' in key.lower():
                            settings['max_execution_time'] = value
                        elif 'upload_max_filesize' in key.lower():
                            settings['upload_max_filesize'] = value
                        elif 'post_max_size' in key.lower():
                            settings['post_max_size'] = value
                        elif 'max_file_uploads' in key.lower():
                            settings['max_file_uploads'] = value
        
        # Provide default values if not found
        if not settings:
            settings = {
                'memory_limit': '256M',
                'max_execution_time': '30',
                'upload_max_filesize': '64M',
                'post_max_size': '64M',
                'max_file_uploads': '20',
                'display_errors': 'Off',
                'log_errors': 'On',
                'error_log': '/var/log/php_errors.log'
            }
        
        return jsonify({
            'settings': settings,
            'note': 'Some settings may be simulated in development environment'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@php_bp.route("/php/settings", methods=["POST"])
@jwt_required()
def update_php_settings():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        settings = data.get('settings', {})
        
        if not settings:
            return jsonify({'error': 'Settings data is required'}), 400
        
        # Validate settings
        valid_settings = {
            'memory_limit', 'max_execution_time', 'upload_max_filesize',
            'post_max_size', 'max_file_uploads', 'display_errors', 'log_errors'
        }
        
        updated_settings = {}
        for key, value in settings.items():
            if key in valid_settings:
                updated_settings[key] = value
        
        # In production, this would write to php.ini and restart PHP-FPM
        return jsonify({
            'message': 'PHP settings updated successfully (simulated)',
            'updated_settings': updated_settings,
            'note': 'This is a simulation. In production, this would update php.ini and restart PHP-FPM.'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@php_bp.route("/php/modules", methods=["GET"])
@jwt_required()
def get_php_modules():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get PHP modules
        modules_result = run_command('php -m')
        modules = []
        
        if modules_result['success']:
            modules = [module.strip() for module in modules_result['stdout'].split('\n') if module.strip()]
        else:
            # Provide common modules as fallback
            modules = [
                'Core', 'date', 'libxml', 'openssl', 'pcre', 'sqlite3', 'zlib',
                'ctype', 'curl', 'dom', 'fileinfo', 'filter', 'ftp', 'hash',
                'iconv', 'json', 'mbstring', 'mysqlnd', 'mysqli', 'PDO',
                'pdo_mysql', 'pdo_sqlite', 'Phar', 'posix', 'readline',
                'Reflection', 'session', 'SimpleXML', 'SPL', 'standard',
                'tokenizer', 'xml', 'xmlreader', 'xmlwriter', 'zip'
            ]
        
        return jsonify({
            'modules': modules,
            'count': len(modules),
            'note': 'Module list may be simulated in development environment'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@php_bp.route("/php/restart", methods=["POST"])
@jwt_required()
def restart_php_fpm():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Simulate PHP-FPM restart
        restart_result = run_command('echo "Simulating PHP-FPM restart"')
        
        return jsonify({
            'message': 'PHP-FPM restart completed (simulated)',
            'result': restart_result,
            'note': 'This is a simulation. In production, this would run: systemctl restart php-fpm'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


