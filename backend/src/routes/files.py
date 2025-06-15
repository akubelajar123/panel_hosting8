import os
import shutil
import mimetypes
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from src.models.user import User

files_bp = Blueprint('files', __name__)

# Base directory untuk file operations (dalam production, ini harus dikonfigurasi dengan aman)
BASE_DIR = '/home/ubuntu/hosting-panel/files'

# Pastikan base directory ada
os.makedirs(BASE_DIR, exist_ok=True)

def get_user_directory(user_id):
    """Get user-specific directory"""
    user_root_dir = os.path.join(BASE_DIR, f'user_{user_id}')
    public_html_dir = os.path.join(user_root_dir, 'public_html')
    os.makedirs(public_html_dir, exist_ok=True)
    return public_html_dir

def get_file_info(file_path):
    """Get file information"""
    try:
        stat = os.stat(file_path)
        is_dir = os.path.isdir(file_path)
        
        return {
            'name': os.path.basename(file_path),
            'path': file_path,
            'is_directory': is_dir,
            'size': stat.st_size if not is_dir else 0,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'permissions': oct(stat.st_mode)[-3:],
            'mime_type': mimetypes.guess_type(file_path)[0] if not is_dir else 'directory'
        }
    except Exception as e:
        return None

@files_bp.route('/files', methods=['GET'])
@jwt_required()
def list_files():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Get path parameter
        path = request.args.get('path', '')
        
        # Determine base directory
        if current_user.role == 'admin':
            base_dir = BASE_DIR
        else:
            base_dir = get_user_directory(current_user_id)
        
        # Construct full path
        if path:
            full_path = os.path.join(base_dir, path.lstrip('/'))
        else:
            full_path = base_dir
        
        # Security check - ensure path is within allowed directory
        if not os.path.abspath(full_path).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'Path tidak ditemukan'}), 404
        
        if not os.path.isdir(full_path):
            return jsonify({'error': 'Path bukan direktori'}), 400
        
        # List directory contents
        items = []
        try:
            for item_name in os.listdir(full_path):
                item_path = os.path.join(full_path, item_name)
                file_info = get_file_info(item_path)
                if file_info:
                    # Make path relative to base directory
                    relative_path = os.path.relpath(item_path, base_dir)
                    file_info['relative_path'] = relative_path
                    items.append(file_info)
        except PermissionError:
            return jsonify({'error': 'Tidak ada permission untuk membaca direktori'}), 403
        
        # Sort items - directories first, then files
        items.sort(key=lambda x: (not x['is_directory'], x['name'].lower()))
        
        return jsonify({
            'current_path': os.path.relpath(full_path, base_dir) if full_path != base_dir else '',
            'items': items
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/files/upload', methods=['POST'])
@jwt_required()
def upload_file():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if 'file' not in request.files:
            return jsonify({'error': 'Tidak ada file yang diupload'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nama file kosong'}), 400
        
        # Get target path
        target_path = request.form.get('path', '')
        
        # Determine base directory
        if current_user.role == 'admin':
            base_dir = BASE_DIR
        else:
            base_dir = get_user_directory(current_user_id)
        
        # Construct full target directory
        if target_path:
            target_dir = os.path.join(base_dir, target_path.lstrip('/'))
        else:
            target_dir = base_dir
        
        # Security check
        if not os.path.abspath(target_dir).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        # Ensure target directory exists
        os.makedirs(target_dir, exist_ok=True)
        
        # Secure filename
        filename = secure_filename(file.filename)
        if not filename:
            return jsonify({'error': 'Nama file tidak valid'}), 400
        
        # Check if file already exists
        file_path = os.path.join(target_dir, filename)
        if os.path.exists(file_path):
            # Add timestamp to filename to avoid conflicts
            name, ext = os.path.splitext(filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{name}_{timestamp}{ext}"
            file_path = os.path.join(target_dir, filename)
        
        # Save file
        file.save(file_path)
        
        # Get file info
        file_info = get_file_info(file_path)
        if file_info:
            file_info['relative_path'] = os.path.relpath(file_path, base_dir)
        
        return jsonify({
            'message': 'File berhasil diupload',
            'file': file_info
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/files/download', methods=['GET'])
@jwt_required()
def download_file():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        file_path = request.args.get('path')
        if not file_path:
            return jsonify({'error': 'Path file wajib diisi'}), 400
        
        # Determine base directory
        if current_user.role == 'admin':
            base_dir = BASE_DIR
        else:
            base_dir = get_user_directory(current_user_id)
        
        # Construct full path
        full_path = os.path.join(base_dir, file_path.lstrip('/'))
        
        # Security check
        if not os.path.abspath(full_path).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'File tidak ditemukan'}), 404
        
        if os.path.isdir(full_path):
            return jsonify({'error': 'Tidak bisa download direktori'}), 400
        
        return send_file(full_path, as_attachment=True)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/files/create-folder', methods=['POST'])
@jwt_required()
def create_folder():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        folder_name = data.get('name')
        parent_path = data.get('path', '')
        
        if not folder_name:
            return jsonify({'error': 'Nama folder wajib diisi'}), 400
        
        # Secure folder name
        folder_name = secure_filename(folder_name)
        if not folder_name:
            return jsonify({'error': 'Nama folder tidak valid'}), 400
        
        # Determine base directory
        if current_user.role == 'admin':
            base_dir = BASE_DIR
        else:
            base_dir = get_user_directory(current_user_id)
        
        # Construct parent directory path
        if parent_path:
            parent_dir = os.path.join(base_dir, parent_path.lstrip('/'))
        else:
            parent_dir = base_dir
        
        # Security check
        if not os.path.abspath(parent_dir).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        # Create folder path
        folder_path = os.path.join(parent_dir, folder_name)
        
        if os.path.exists(folder_path):
            return jsonify({'error': 'Folder sudah ada'}), 400
        
        os.makedirs(folder_path)
        
        # Get folder info
        folder_info = get_file_info(folder_path)
        if folder_info:
            folder_info['relative_path'] = os.path.relpath(folder_path, base_dir)
        
        return jsonify({
            'message': 'Folder berhasil dibuat',
            'folder': folder_info
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/files/delete', methods=['DELETE'])
@jwt_required()
def delete_file():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        file_path = request.args.get('path')
        if not file_path:
            return jsonify({'error': 'Path file wajib diisi'}), 400
        
        # Determine base directory
        if current_user.role == 'admin':
            base_dir = BASE_DIR
        else:
            base_dir = get_user_directory(current_user_id)
        
        # Construct full path
        full_path = os.path.join(base_dir, file_path.lstrip('/'))
        
        # Security check
        if not os.path.abspath(full_path).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'File/folder tidak ditemukan'}), 404
        
        # Delete file or directory
        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        
        return jsonify({'message': 'File/folder berhasil dihapus'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/files/rename', methods=['PUT'])
@jwt_required()
def rename_file():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        old_path = data.get('old_path')
        new_name = data.get('new_name')
        
        if not old_path or not new_name:
            return jsonify({'error': 'Path lama dan nama baru wajib diisi'}), 400
        
        # Secure new name
        new_name = secure_filename(new_name)
        if not new_name:
            return jsonify({'error': 'Nama baru tidak valid'}), 400
        
        # Determine base directory
        if current_user.role == 'admin':
            base_dir = BASE_DIR
        else:
            base_dir = get_user_directory(current_user_id)
        
        # Construct paths
        old_full_path = os.path.join(base_dir, old_path.lstrip('/'))
        new_full_path = os.path.join(os.path.dirname(old_full_path), new_name)
        
        # Security checks
        if not os.path.abspath(old_full_path).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        if not os.path.abspath(new_full_path).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        if not os.path.exists(old_full_path):
            return jsonify({'error': 'File/folder tidak ditemukan'}), 404
        
        if os.path.exists(new_full_path):
            return jsonify({'error': 'File/folder dengan nama tersebut sudah ada'}), 400
        
        # Rename
        os.rename(old_full_path, new_full_path)
        
        # Get new file info
        file_info = get_file_info(new_full_path)
        if file_info:
            file_info['relative_path'] = os.path.relpath(new_full_path, base_dir)
        
        return jsonify({
            'message': 'File/folder berhasil direname',
            'file': file_info
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@files_bp.route('/files/edit', methods=['GET'])
@jwt_required()
def get_file_content():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        file_path = request.args.get('path')
        if not file_path:
            return jsonify({'error': 'Path file wajib diisi'}), 400
        
        # Determine base directory
        if current_user.role == 'admin':
            base_dir = BASE_DIR
        else:
            base_dir = get_user_directory(current_user_id)
        
        # Construct full path
        full_path = os.path.join(base_dir, file_path.lstrip('/'))
        
        # Security check
        if not os.path.abspath(full_path).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'File tidak ditemukan'}), 404
        
        if os.path.isdir(full_path):
            return jsonify({'error': 'Tidak bisa edit direktori'}), 400
        
        # Check file size (limit to 1MB for editing)
        file_size = os.path.getsize(full_path)
        if file_size > 1024 * 1024:  # 1MB
            return jsonify({'error': 'File terlalu besar untuk diedit (maksimal 1MB)'}), 400
        
        # Read file content
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                with open(full_path, 'r', encoding='latin-1') as f:
                    content = f.read()
            except:
                return jsonify({'error': 'File tidak bisa dibaca (bukan file teks)'}), 400
        
        return jsonify({
            'content': content,
            'path': file_path,
            'size': file_size
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/files/edit', methods=['POST'])
@jwt_required()
def save_file_content():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        file_path = data.get('path')
        content = data.get('content', '')
        
        if not file_path:
            return jsonify({'error': 'Path file wajib diisi'}), 400
        
        # Determine base directory
        if current_user.role == 'admin':
            base_dir = BASE_DIR
        else:
            base_dir = get_user_directory(current_user_id)
        
        # Construct full path
        full_path = os.path.join(base_dir, file_path.lstrip('/'))
        
        # Security check
        if not os.path.abspath(full_path).startswith(os.path.abspath(base_dir)):
            return jsonify({'error': 'Akses ditolak'}), 403
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'File tidak ditemukan'}), 404
        
        if os.path.isdir(full_path):
            return jsonify({'error': 'Tidak bisa edit direktori'}), 400
        
        # Create backup
        backup_path = full_path + '.backup'
        try:
            shutil.copy2(full_path, backup_path)
        except:
            pass  # Continue even if backup fails
        
        # Save file content
        try:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            # Restore backup if save fails
            if os.path.exists(backup_path):
                try:
                    shutil.copy2(backup_path, full_path)
                except:
                    pass
            return jsonify({'error': f'Gagal menyimpan file: {str(e)}'}), 500
        
        # Remove backup after successful save
        if os.path.exists(backup_path):
            try:
                os.remove(backup_path)
            except:
                pass
        
        return jsonify({
            'message': 'File berhasil disimpan',
            'path': file_path
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

