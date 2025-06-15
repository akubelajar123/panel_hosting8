from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User, Domain, db
import re
import socket
import subprocess
import traceback # Import traceback module

domain_bp = Blueprint(\'domain\', __name__)

def validate_domain(domain):
    """Validate domain name format"""
    pattern = r\'^[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?)*$\'
    return re.match(pattern, domain) is not None

def check_domain_availability(domain):
    """Check if domain is available using whois"""
    try:
        result = subprocess.run([\'whois\', domain], capture_output=True, text=True, timeout=10)
        # Simple check - if "No match" or "Not found" in output, domain might be available
        output = result.stdout.lower()
        if \'no match\' in output or \'not found\' in output or \'no data found\' in output:
            return True, \'Domain appears to be available\'
        else:
            return False, \'Domain is registered\'
    except subprocess.TimeoutExpired:
        return None, \'Whois lookup timeout\'
    except Exception as e:
        return None, f\'Whois lookup failed: {str(e)}\'

@domain_bp.route(\'/domains\', methods=[\'GET\'])
@jwt_required()
def get_domains():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role == \'admin\':
            domains = Domain.query.all()
        else:
            domains = Domain.query.filter_by(user_id=current_user_id).all()
        
        domains_data = []
        for domain in domains:
            owner = User.query.get(domain.user_id)
            domains_data.append({
                \'id\': domain.id,
                \'name\': domain.name,
                \'status\': domain.status,
                \'owner\': owner.username if owner else \'Unknown\',
                \'created_at\': domain.created_at.isoformat() if domain.created_at else None,
                \'expires_at\': domain.expires_at.isoformat() if domain.expires_at else None
            })
        
        return jsonify({\'domains\': domains_data}), 200
        
    except Exception as e:
        print(f"Error in get_domains: {e}") # Added for debugging
        traceback.print_exc() # Print full traceback
        return jsonify({\'error\': str(e)}), 500

@domain_bp.route(\'/domains\', methods=[\'POST\'])
@jwt_required()
def create_domain():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        domain_name = data.get(\'name\')
        
        if not domain_name:
            return jsonify({\'error\': \'Nama domain wajib diisi\'}), 400
        
        # Validate domain format
        if not validate_domain(domain_name):
            return jsonify({\'error\': \'Format domain tidak valid\'}), 400
        
        # Check if domain already exists in our system
        existing_domain = Domain.query.filter_by(name=domain_name).first()
        if existing_domain:
            return jsonify({\'error\': \'Domain sudah terdaftar dalam sistem\'}), 400
        
        # For admin, allow specifying user_id
        if current_user.role == \'admin\' and \'user_id\' in data:
            target_user_id = data[\'user_id\']
            target_user = User.query.get(target_user_id)
            if not target_user:
                return jsonify({\'error\': \'User tidak ditemukan\'}), 404
        else:
            target_user_id = current_user_id
        
        # Create domain
        domain = Domain(
            name=domain_name,
            user_id=target_user_id,
            status=\'active\'
        )
        
        db.session.add(domain)
        db.session.commit()
        
        return jsonify({
            \'message\': \'Domain berhasil ditambahkan\',
            \'domain\': {
                \'id\': domain.id,
                \'name\': domain.name,
                \'status\': domain.status,
                \'user_id\': domain.user_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in create_domain: {e}") # Added for debugging
        traceback.print_exc() # Print full traceback
        return jsonify({\'error\': str(e)}), 500

@domain_bp.route(\'/domains/<int:domain_id>\', methods=[\'PUT\'])
@jwt_required()
def update_domain(domain_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        domain = Domain.query.get(domain_id)
        if not domain:
            return jsonify({\'error\': \'Domain tidak ditemukan\'}), 404
        
        # Check permissions
        if current_user.role != \'admin\' and domain.user_id != current_user_id:
            return jsonify({\'error\': \'Tidak memiliki akses untuk mengubah domain ini\'}), 403
        
        data = request.get_json()
        
        # Update fields if provided
        if \'status\' in data:
            valid_statuses = [\'active\', \'suspended\', \'expired\', \'pending\']
            if data[\'status\'] not in valid_statuses:
                return jsonify({\'error\': f\'Status tidak valid. Gunakan: {\", \".join(valid_statuses)}\'}), 400
            domain.status = data[\'status\']
        
        if \'expires_at\' in data and current_user.role == \'admin\':
            from datetime import datetime
            try:
                domain.expires_at = datetime.fromisoformat(data[\'expires_at\'])
            except ValueError:
                return jsonify({\'error\': \'Format tanggal expires_at tidak valid (gunakan ISO format)\'}), 400
        
        db.session.commit()
        
        return jsonify({
            \'message\': \'Domain berhasil diupdate\',
            \'domain\': {
                \'id\': domain.id,
                \'name\': domain.name,
                \'status\': domain.status,
                \'expires_at\': domain.expires_at.isoformat() if domain.expires_at else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in update_domain: {e}") # Added for debugging
        traceback.print_exc() # Print full traceback
        return jsonify({\'error\': str(e)}), 500

@domain_bp.route(\'/domains/<int:domain_id>\', methods=[\'DELETE\'])
@jwt_required()
def delete_domain(domain_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        domain = Domain.query.get(domain_id)
        if not domain:
            return jsonify({\'error\': \'Domain tidak ditemukan\'}), 404
        
        # Check permissions
        if current_user.role != \'admin\' and domain.user_id != current_user_id:
            return jsonify({\'error\': \'Tidak memiliki akses untuk menghapus domain ini\'}), 403
        
        # Delete associated DNS records first
        from src.models.user import DNSRecord
        DNSRecord.query.filter_by(domain_id=domain.id).delete()
        
        db.session.delete(domain)
        db.session.commit()
        
        return jsonify({\'message\': \'Domain berhasil dihapus\'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in delete_domain: {e}") # Added for debugging
        traceback.print_exc() # Print full traceback
        return jsonify({\'error\': str(e)}), 500

@domain_bp.route(\'/domains/check\', methods=[\'GET\'])
@jwt_required()
def check_domain():
    try:
        domain_name = request.args.get(\'domain\')
        
        if not domain_name:
            return jsonify({\'error\': \'Nama domain wajib diisi\'}), 400
        
        if not validate_domain(domain_name):
            return jsonify({\'error\': \'Format domain tidak valid\'}), 400
        
        # Check if domain exists in our system
        existing_domain = Domain.query.filter_by(name=domain_name).first()
        in_system = existing_domain is not None
        
        # Check domain availability via whois
        available, whois_message = check_domain_availability(domain_name)
        
        return jsonify({
            \'domain\': domain_name,
            \'in_system\': in_system,
            \'available\': available,
            \'whois_message\': whois_message,
            \'owner\': existing_domain.user_id if existing_domain else None
        }), 200
        
    except Exception as e:
        print(f"Error in check_domain: {e}") # Added for debugging
        traceback.print_exc() # Print full traceback
        return jsonify({\'error\': str(e)}), 500

@domain_bp.route(\'/domains/search\', methods=[\'GET\'])
@jwt_required()
def search_domains():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        query = request.args.get(\'q\', \'\')
        
        if current_user.role == \'admin\':
            domains = Domain.query.filter(Domain.name.contains(query)).all()
        else:
            domains = Domain.query.filter(
                Domain.user_id == current_user_id,
                Domain.name.contains(query)
            ).all()
        
        domains_data = []
        for domain in domains:
            owner = User.query.get(domain.user_id)
            domains_data.append({
                \'id\': domain.id,
                \'name\': domain.name,
                \'status\': domain.status,
                \'owner\': owner.username if owner else \'Unknown\',
                \'created_at\': domain.created_at.isoformat() if domain.created_at else None
            })
        
        return jsonify({\'domains\': domains_data}), 200
        
    except Exception as e:
        print(f"Error in search_domains: {e}") # Added for debugging
        traceback.print_exc() # Print full traceback
        return jsonify({\'error\': str(e)}), 500

@domain_bp.route(\'/domains/stats\', methods=[\'GET\'])
@jwt_required()
def get_domain_stats():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role == \'admin\':
            total_domains = Domain.query.count()
            active_domains = Domain.query.filter_by(status=\'active\').count()
            suspended_domains = Domain.query.filter_by(status=\'suspended\').count()
            expired_domains = Domain.query.filter_by(status=\'expired\').count()
        else:
            total_domains = Domain.query.filter_by(user_id=current_user_id).count()
            active_domains = Domain.query.filter_by(user_id=current_user_id, status=\'active\').count()
            suspended_domains = Domain.query.filter_by(user_id=current_user_id, status=\'suspended\').count()
            expired_domains = Domain.query.filter_by(user_id=current_user_id, status=\'expired\').count()
        
        return jsonify({
            \'total\': total_domains,
            \'active\': active_domains,
            \'suspended\': suspended_domains,
            \'expired\': expired_domains
        }), 200
        
    except Exception as e:
        print(f"Error in get_domain_stats: {e}") # Added for debugging
        traceback.print_exc() # Print full traceback
        return jsonify({\'error\': str(e)}), 500



